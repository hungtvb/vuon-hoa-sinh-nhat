"use strict";
/* ================================================================
   MusicEngine — a small piano engine driven by sheet JSON.
   Part of skill local-music-engine. One core schedules notes for
   BOTH the live WebAudio player and the offline MP3 renderer, so
   what Tony approves in the MP3 is what plays in the browser.

   Sheet format (times in BEATS, never seconds):
   {
     "title": "...", "key": "D", "bpm": 57, "beatsPerBar": 4,
     "sections": [ {"name":"intro","beats":4}, {"name":"rain","beats":16,"loop":true} ],
     "tracks": [
       {"role":"melody","gain":1.0,"notes":[{"n":"F#5","at":32,"len":1,"v":0.8}]},
       {"role":"arp","gain":0.8,"blocks":[
          {"chord":"D","base":"D4","at":4,"beats":2,"step":0.5,
           "pattern":[0,4,7,12,7,4],"v":0.32} ]},
       {"role":"fx","notes":[{"strum":["D3","A3","D4","F#4"],"at":15,"stagger":0.05,"v":0.7}]}
     ]
   }
   - notes: n = note name ("F#5","Bb3"), at/len in beats, v = velocity 0..1
   - strum: list of note names played with `stagger` seconds between them
   - arp block: `pattern` = semitone offsets above `base`, repeated every
     `step` beats for `beats` beats. `chord` is documentation only.
   ================================================================ */
(function (global) {
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function nameToMidi(name) {
    var m = /^([A-G])(#|b)?(\d)$/.exec(name);
    if (!m) throw new Error("bad note name: " + name);
    var s = SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    return (parseInt(m[3], 10) + 1) * 12 + s;
  }
  // Salamander anchor samples: every minor third (C, D#, F#, A)
  var ANCHORS = [];
  (function () {
    var n, o;
    for (n = 1; n <= 8; n++) ANCHORS.push({ f: "C" + n, m: 12 * (n + 1) });
    for (n = 0; n <= 7; n++) ANCHORS.push({ f: "A" + n, m: 12 * (n + 1) + 9 });
    for (n = 1; n <= 7; n++) ANCHORS.push({ f: "Ds" + n, m: 12 * (n + 1) + 3 });
    for (n = 1; n <= 7; n++) ANCHORS.push({ f: "Fs" + n, m: 12 * (n + 1) + 6 });
    ANCHORS.sort(function (a, b) { return a.m - b.m; });
  })();
  function nearestAnchor(midi) {
    var best = ANCHORS[0], bd = 1e9;
    for (var i = 0; i < ANCHORS.length; i++) {
      var d = Math.abs(ANCHORS[i].m - midi);
      if (d < bd) { bd = d; best = ANCHORS[i]; }
    }
    return best;
  }
  // deterministic humanization (same in live + render: no Math.random)
  function hash01(i, salt) {
    var x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /* ---------- expand a sheet into a flat event list ---------- */
  function expandSheet(sheet) {
    var events = [];
    (sheet.tracks || []).forEach(function (track) {
      var gain = track.gain != null ? track.gain : 1;
      (track.notes || []).forEach(function (nt) {
        if (nt.strum) {
          nt.strum.forEach(function (nm, si) {
            events.push({ midi: nameToMidi(nm), beat: nt.at, len: nt.len || 2, v: (nt.v || 0.7), gain: gain, strumSec: si * (nt.stagger || 0.05), damp: nt.damp || 0 });
          });
        } else {
          events.push({ midi: nameToMidi(nt.n), beat: nt.at, len: nt.len || 1, v: nt.v != null ? nt.v : 0.7, gain: gain, strumSec: 0, damp: nt.damp || 0 });
        }
      });
      (track.blocks || []).forEach(function (blk) {
        var base = nameToMidi(blk.base);
        var steps = Math.floor(blk.beats / blk.step);
        for (var s = 0; s < steps; s++) {
          var off = blk.pattern[s % blk.pattern.length];
          events.push({
            midi: base + off, beat: blk.at + s * blk.step, len: blk.len || blk.step * 1.8,
            v: blk.v != null ? blk.v : 0.3, gain: gain, strumSec: 0
          });
        }
      });
    });
    events.sort(function (a, b) { return a.beat - b.beat; });
    return events;
  }
  function sectionLayout(sheet) {
    var at = 0, out = [];
    (sheet.sections || []).forEach(function (s) {
      out.push({ name: s.name, startBeat: at, beats: s.beats, loop: !!s.loop });
      at += s.beats;
    });
    return { sections: out, totalBeats: at };
  }

  /* ---------- sample bank: fetch once, decode per context ---------- */
  function SampleBank(baseUrl) { this.baseUrl = baseUrl; this.raw = {}; }
  SampleBank.prototype.fetchAnchors = function (anchorFiles) {
    var self = this, jobs = [];
    anchorFiles.forEach(function (f) {
      if (self.raw[f]) return;
      jobs.push(fetch(self.baseUrl + f + ".mp3")
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (ab) { self.raw[f] = ab; }));
    });
    return Promise.all(jobs);
  };
  SampleBank.prototype.decodeAll = function (ctx) {
    var self = this, out = {}, jobs = [];
    Object.keys(this.raw).forEach(function (f) {
      jobs.push(ctx.decodeAudioData(self.raw[f].slice(0)).then(function (buf) { out[f] = buf; }));
    });
    return Promise.all(jobs).then(function () { return out; });
  };

  /* ---------- scheduling core (shared live/offline) ---------- */
  function makeReverb(ctx, dest, wet) {
    var len = Math.floor(ctx.sampleRate * 2.2);
    var ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    var conv = ctx.createConvolver(); conv.buffer = ir;
    var g = ctx.createGain(); g.gain.value = wet;
    conv.connect(g); g.connect(dest);
    return conv;
  }
  // Schedule events with beat in [fromBeat, toBeat) at context time startCtxTime.
  // Returns scheduled source nodes (for stop()).
  function scheduleRange(ctx, dest, reverb, buffers, events, sheet, fromBeat, toBeat, startCtxTime, humanize) {
    var spb = 60 / sheet.bpm; // seconds per beat
    var sources = [];
    events.forEach(function (ev, idx) {
      if (ev.beat < fromBeat || ev.beat >= toBeat) return;
      var anchor = nearestAnchor(ev.midi);
      var buf = buffers[anchor.f];
      if (!buf) return;
      var t = startCtxTime + (ev.beat - fromBeat) * spb + (ev.strumSec || 0);
      var vel = ev.v * ev.gain;
      if (humanize) {
        t += (hash01(idx, 1) - 0.5) * 0.024;
        vel *= 0.94 + 0.12 * hash01(idx, 2);
      }
      if (t < ctx.currentTime - 0.05) return; // too late (live catch-up)
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = Math.pow(2, (ev.midi - anchor.m) / 12);
      var g = ctx.createGain();
      var peak = Math.pow(Math.min(1, vel), 1.3) * 0.85; // velocity curve: restores dynamic contrast
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.004);
      var ring = Math.min(buf.duration / src.playbackRate.value,
        (ev.len * spb + 2.4) * (1 - 0.75 * (ev.damp || 0)));
      var relT = t + Math.max(0.3, ring - 0.15);
      g.gain.setValueAtTime(peak, Math.max(t + 0.005, relT - 0.15));
      g.gain.linearRampToValueAtTime(0, relT + 0.15);
      src.connect(g); g.connect(dest); g.connect(reverb);
      src.start(t); src.stop(relT + 0.2);
      sources.push(src);
    });
    return sources;
  }

  /* ---------- live player ---------- */
  function Player(opts) {
    this.baseUrl = opts.samplesBase;
    this.bank = new SampleBank(opts.samplesBase);
    this.ctx = null; this.sheet = null; this.events = null; this.buffers = null;
    this.sources = []; this.timer = null; this.playing = false;
    this.master = null; this.muted = false; this.volume = opts.volume != null ? opts.volume : 0.9;
    this.loopInfo = null; this.nextLoopCtx = 0; this.startCtx = 0;
    this.onended = opts.onended || null;
    this.notesPlayed = 0;
  }
  Player.prototype.load = function (sheet) {
    var self = this;
    this.sheet = sheet;
    this.events = expandSheet(sheet);
    var need = {};
    this.events.forEach(function (ev) { need[nearestAnchor(ev.midi).f] = true; });
    return this.bank.fetchAnchors(Object.keys(need)).then(function () { return self; });
  };
  Player.prototype._ensureCtx = function () {
    if (this.ctx) return;
    var AC = global.AudioContext || global.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    var comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.18;
    this.master.connect(comp); comp.connect(this.ctx.destination);
    this.reverb = makeReverb(this.ctx, comp, 0.16);
  };
  Player.prototype.play = function () {
    var self = this;
    this._ensureCtx();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.bank.decodeAll(this.ctx).then(function (buffers) {
      self.buffers = buffers;
      self.stopSources();
      var layout = sectionLayout(self.sheet);
      var spb = 60 / self.sheet.bpm;
      var loopSec = layout.sections.filter(function (s) { return s.loop; })[0] || null;
      self.startCtx = self.ctx.currentTime + 0.06;
      var preBeats = loopSec ? loopSec.startBeat : layout.totalBeats;
      // schedule everything before the loop section (or the whole piece)
      self.sources = self.sources.concat(scheduleRange(
        self.ctx, self.master, self.reverb, buffers, self.events, self.sheet,
        0, preBeats, self.startCtx, true));
      self.playing = true;
      self.notesPlayed = self.events.filter(function (e) { return e.beat < preBeats; }).length;
      if (loopSec) {
        self.loopInfo = { startBeat: loopSec.startBeat, beats: loopSec.beats, durSec: loopSec.beats * spb };
        self.nextLoopCtx = self.startCtx + loopSec.startBeat * spb;
        // schedule first loop pass now, then keep 2 passes ahead
        self._scheduleLoopPass();
        self._scheduleLoopPass();
        self.timer = setInterval(function () {
          if (!self.playing) return;
          while (self.nextLoopCtx < self.ctx.currentTime + 3) self._scheduleLoopPass();
        }, 400);
      } else if (self.onended) {
        var totalMs = (layout.totalBeats * spb + 2.5) * 1000;
        self.timer = setTimeout(function () { self.playing = false; if (self.onended) self.onended(); }, totalMs);
      }
      return self;
    });
  };
  Player.prototype._scheduleLoopPass = function () {
    var L = this.loopInfo, spb = 60 / this.sheet.bpm;
    var srcs = scheduleRange(this.ctx, this.master, this.reverb, this.buffers,
      this.events, this.sheet, L.startBeat, L.startBeat + L.beats, this.nextLoopCtx, true);
    this.sources = this.sources.concat(srcs);
    this.notesPlayed += srcs.length;
    this.nextLoopCtx += L.durSec;
  };
  Player.prototype.stopSources = function () {
    this.sources.forEach(function (s) { try { s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} });
    this.sources = [];
  };
  Player.prototype.stop = function () {
    this.playing = false;
    if (this.timer) { clearInterval(this.timer); clearTimeout(this.timer); this.timer = null; }
    this.stopSources();
  };
  Player.prototype.setMuted = function (m) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.03);
  };
  Player.prototype.setVolume = function (v) {
    this.volume = v;
    if (this.master && this.ctx && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  };

  /* ---------- offline render (same core, OfflineAudioContext) ---------- */
  function renderOffline(sheet, opts) {
    opts = opts || {};
    var bank = new SampleBank(opts.samplesBase);
    var events = expandSheet(sheet);
    var layout = sectionLayout(sheet);
    var loopSec = layout.sections.filter(function (s) { return s.loop; })[0] || null;
    var extraLoops = opts.extraLoops != null ? opts.extraLoops : (loopSec ? 1 : 0);
    var totalBeats = layout.totalBeats + (loopSec ? loopSec.beats * extraLoops : 0);
    var spb = 60 / sheet.bpm;
    var durSec = totalBeats * spb + (opts.tailSec != null ? opts.tailSec : 3);
    var need = {};
    events.forEach(function (ev) { need[nearestAnchor(ev.midi).f] = true; });
    return bank.fetchAnchors(Object.keys(need)).then(function () {
      var ctx = new OfflineAudioContext(2, Math.ceil(durSec * 44100), 44100);
      return bank.decodeAll(ctx).then(function (buffers) {
        var master = ctx.createGain(); master.gain.value = opts.volume != null ? opts.volume : 0.95;
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.18;
        master.connect(comp); comp.connect(ctx.destination);
        var reverb = makeReverb(ctx, comp, 0.16);
        var preBeats = loopSec ? loopSec.startBeat : layout.totalBeats;
        scheduleRange(ctx, master, reverb, buffers, events, sheet, 0, preBeats, 0.05, true);
        if (loopSec) {
          // pass 0 is the section's own first play; passes 1..extraLoops repeat it.
          // Same windowing trick as the live loop: unshifted events,
          // the pass offset lives entirely in startCtxTime.
          for (var i = 0; i <= extraLoops; i++) {
            scheduleRange(ctx, master, reverb, buffers, events, sheet,
              loopSec.startBeat, loopSec.startBeat + loopSec.beats,
              0.05 + (loopSec.startBeat + i * loopSec.beats) * spb, true);
          }
        }
        return ctx.startRendering();
      });
    });
  }

  /* ---------- WAV encode (16-bit PCM) ---------- */
  function encodeWAV(buffer) {
    var nCh = Math.min(2, buffer.numberOfChannels), sr = buffer.sampleRate;
    var len = buffer.length, bytes = 44 + len * nCh * 2;
    var ab = new ArrayBuffer(bytes), v = new DataView(ab);
    function wstr(off, s) { for (var i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); }
    wstr(0, "RIFF"); v.setUint32(4, bytes - 8, true); wstr(8, "WAVEfmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * nCh * 2, true);
    v.setUint16(32, nCh * 2, true); v.setUint16(34, 16, true); wstr(36, "data");
    v.setUint32(40, len * nCh * 2, true);
    var chans = [];
    for (var c = 0; c < nCh; c++) chans.push(buffer.getChannelData(c));
    var off = 44;
    for (var i = 0; i < len; i++) {
      for (var c2 = 0; c2 < nCh; c2++) {
        var s = Math.max(-1, Math.min(1, chans[c2][i]));
        v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
      }
    }
    return ab;
  }

  global.MusicEngine = {
    nameToMidi: nameToMidi,
    nearestAnchor: nearestAnchor,
    expandSheet: expandSheet,
    sectionLayout: sectionLayout,
    sectionTimes: function (sheet) {
      var spb = 60 / sheet.bpm;
      return sectionLayout(sheet).sections.map(function (s) {
        return { name: s.name, atSec: s.startBeat * spb, durSec: s.beats * spb, loop: s.loop };
      });
    },
    Player: Player,
    renderOffline: renderOffline,
    encodeWAV: encodeWAV
  };
})(typeof window !== "undefined" ? window : this);
