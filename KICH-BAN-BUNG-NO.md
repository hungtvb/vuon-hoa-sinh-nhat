# KỊCH BẢN — Bản "Bùng Nổ" (v11): MƯA LỜI CHÚC HÓA TIM

> Mục đích: một bản duy nhất làm theo đúng công thức đã mổ từ mẫu rain-love của lovegift (REA + đọc code), chuyển ngữ sang sinh nhật chị gái, tông sáng pastel hồng + kem anh đã chốt. Không ghi tên chị trong web.
> Trạng thái: **CHỜ TONY DUYỆT — chưa code.**

## Ý tưởng cốt lõi (1 câu)
Người xem tự tay tạo ra món quà: chạm cho hoa nở tung → cơn mưa lời chúc 3D đổ xuống → **giữ tay gom cơn mưa thành một trái tim** → chạm đủ 3 nhịp tim cho trái tim **bùng nổ** mở ra lá thư sinh nhật.

## Công nghệ (theo đúng công thức mẫu)
- Three.js (self-host file vendor trong repo như cách mẫu làm — không phụ thuộc CDN) + hiệu ứng phát sáng bloom.
- Mọi chuyển động là vật lý hạt chạy từng khung hình (vận tốc, lực hút, xoáy, phanh mềm), KHÔNG dùng CSS transition cho phần chính.
- Nhạc nền phát từ cú chạm đầu tiên (đúng user gesture), có nút bật/tắt nhạc.
- Tự hạ mật độ hạt trên máy yếu (đếm nhân CPU/bộ nhớ như mẫu) để giữ 60fps.
- Khóa menu nhấn-giữ của trình duyệt (3 lớp như quy tắc cũ).

---

## MÀN 0 — MỞ ĐẦU: NỤ HOA CHỜ NỞ (0:00 – chạm)
- Nền gradient hồng kem sáng, vài hạt sáng lơ lửng rất thưa.
- Giữa màn hình: **một nụ hoa 3D** (dựng bằng Three.js, 5 vòng cánh cong có thông số riêng như mẫu, dán texture cánh hoa và đổi màu sang tông hồng pastel) thở nhẹ (scale lên xuống rất chậm).
- Dòng chữ tay: "Một món quà sinh nhật" + chữ serif lớn: "Dành Cho Chị" + nút pill: **"Chạm để mở quà"**.
- Không có gì tự chạy tiếp — nhịp chờ tạo tò mò.

## MÀN 1 — BÙNG NỔ THỨ NHẤT: HOA NỞ, MƯA ĐỔ (sau cú chạm, ~5 giây)
- Cú chạm làm 3 việc cùng lúc: **nhạc vào**, nụ hoa **nở bừng trong ~1,9 giây** (vòng cánh ngoài nở trước, vòng trong sau), rồi **cánh hoa tung ra** bay quanh và rơi xuống (~1,25 giây).
- Hoa mờ dần, từ trên cao **cơn mưa lời chúc đổ ào xuống** (bắt đầu ~giây 2, full màn ở giây 5):
  - **Lưới chữ 3D: 8 lớp sâu × 15 cột** — hàng trăm câu chúc rơi cùng lúc ở nhiều độ sâu, câu gần to và rõ, câu xa nhỏ và mờ.
  - Xen kẽ: **~100 biểu tượng** (trái tim nhỏ + bông hoa nhỏ) rơi chậm hơn.
  - Xen kẽ vài **thẻ ảnh polaroid** (3 tranh watercolor sẵn có: bánh, bó hoa, phong bì) trôi và tự xoay chậm giữa cơn mưa.
  - **~1.000 hạt sáng** lấp lánh phủ toàn màn.
  - Nền lúc mưa: gradient đào–hồng **sâu hơn nền thường một bậc** để hạt phát sáng nổi lên (vẫn thuộc họ sáng pastel, không phải nền đen như mẫu tình yêu) — *điểm cần anh duyệt, xem mục cuối.*
- Hiện gợi ý: "Chạm & giữ để gom lời chúc" (sau ~1 giây kể từ khi mưa full).

### Kho chữ rơi (15 câu — chờ anh duyệt nội dung)
1. Chúc mừng sinh nhật chị
2. Chúc chị luôn khỏe mạnh
3. Tuổi mới rực rỡ hơn
4. Hạnh phúc ngập tràn
5. Cười thật nhiều nhé chị
6. Bình an mỗi ngày
7. May mắn luôn mỉm cười
8. Mọi điều ước đều thành thật
9. Thêm một tuổi thêm vui
10. Công việc thuận lợi
11. Luôn xinh đẹp như hôm nay
12. Được thương thật nhiều
13. Chị là tuyệt nhất
14. Năm nay thật nhiều tin vui
15. Thương chị nhiều

## MÀN 2 — GOM MƯA THÀNH TIM (giữ tay ~1,8 giây)
- Người xem **nhấn giữ** bất cứ đâu: toàn bộ chữ, hoa, tim, hạt sáng **bị hút về phía ngón tay**, xoáy như lốc, vòng xoáy siết nhỏ dần.
- Giữ đủ **1,8 giây**: vòng xoáy siết thành **một trái tim** ngay tại chỗ — trái tim được **lấp đầy bằng chính những mảnh chữ/hoa vừa gom** (không phải hình vẽ trơn chèn vào).
- Buông tay sớm: tiến trình tụt dần (xoáy nở ra lại) — phải giữ đủ mới thành, tạo cảm giác "tự tay làm ra".
- Trái tim hoàn chỉnh **bay về giữa màn hình**, thu về đúng vị trí trung tâm và đập nhẹ (pulse) — chuyển sang màn kết. Kèm vòng sáng mỏng bao quanh + vệt hạt nhỏ bay quanh.

## MÀN 3 — TRÁI TIM NGÂN HÀ & NHỊP TIM (màn kết sống)
- Giữa: trái tim lớn phát sáng, đập theo nhịp.
- Quanh tim: **các thẻ lời chúc + ảnh bay theo quỹ đạo ellipse** (chu kỳ ~50 giây/vòng, thỉnh thoảng "surge" tăng tốc nhẹ rồi lắng lại như mẫu; phanh mềm khi có chạm, không khựng giật).
- Chạm một thẻ đang bay → thẻ phóng to giữa màn để đọc lại lời chúc, chạm nữa để quay lại quỹ đạo.
- Trên đầu: đồng hồ "nhịp tim" **0/3** — chạm vào trái tim 3 lần, mỗi lần tim nảy mạnh + rung nhẹ + hạt tóe ra.
- Nền không đứng yên: hạt sáng và tim nhỏ luôn bay lên chậm.

## MÀN 4 — BÙNG NỔ THỨ HAI: TIM NỞ, THƯ MỞ (sau nhịp tim thứ 3)
- Trái tim **bùng nổ ~2,7 giây**: nở căng, vỡ thành ngàn hạt sáng + cánh hoa bắn ra toàn màn, pháo hạt pastel.
- Từ tâm vụ nổ, **lá thư sinh nhật mở ra** (giấy kem, chữ tay, có ảnh polaroid bó hoa dán băng dính):

> Chúc mừng sinh nhật chị.
> Hôm nay là ngày của chị, nên em gom hết những lời chúc đẹp nhất lại thành một cơn mưa, để chị tự tay gom chúng thành một trái tim — như cách chị vẫn gom yêu thương cho cả nhà.
> Mong tuổi mới của chị thật khỏe, thật vui, và lúc nào cũng rực rỡ như chính chị.
> — Thương chị nhiều

- Dưới thư: 4 nút chọn điều ước (Sức khỏe dồi dào / Hạnh phúc ngập tràn / Bình an mỗi ngày / May mắn mỉm cười) — chọn xong, điều ước **bay lên trời** thành một ngôi sao sáng đứng yên trên nền.
- Nút phụ: "Xem lại từ đầu" và nút bật/tắt nhạc.

---

## Thông số "đạt" (định nghĩa trước khi code, để nghiệm thu)
1. Mật độ lúc mưa full: ≥ 300 phần tử chuyển động đồng thời (chữ + tim/hoa + ảnh) và ~1.000 hạt sáng trên máy mạnh; máy yếu giảm còn ~50% nhưng không dưới 150 phần tử.
2. Giữ-gom hoạt động bằng cảm ứng thật trên điện thoại: hút + xoáy + siết thành tim trong 1,8 giây; buông sớm thì tụt tiến trình.
3. Hai cú bùng nổ rõ rệt (hoa tung cánh ở màn 1, tim vỡ ở màn 4) — xem là thấy "nổ", không phải chuyển cảnh thường.
4. Nhạc vào đúng cú chạm đầu, không cần thao tác thêm; có nút tắt.
5. Chạy mượt (không giật khung hình thấy rõ) trên trình duyệt điện thoại tầm trung; có screenshot/video nghiệm thu từng màn trước khi báo anh.
6. Đẩy lên thành bản **v11** riêng tại /v11/, không đụng 10 bản cũ và mục lục vẫn giữ nguyên (chỉ thêm 1 thẻ v11 khi anh duyệt xong bản này).

## Điểm cần anh duyệt riêng
1. **Nền lúc mưa**: sâu hơn một bậc (đào–hồng đậm vừa) để hạt phát sáng nổi — hay giữ sáng hẳn và chấp nhận hạt kém nổi hơn?
2. **Nhạc nền**: (a) dùng lại file nhạc instrumental anh đã gửi cho quà 20/10, (b) anh gửi file mới cho quà chị, (c) em tìm bản Happy Birthday instrumental miễn phí.
3. **15 câu chữ rơi** ở màn 1: giữ nguyên hay anh muốn sửa/thêm câu nào (vẫn không để tên chị)?
4. **Nội dung lá thư** ở màn 4: giữ nguyên hay anh sửa?
