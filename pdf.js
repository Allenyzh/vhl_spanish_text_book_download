import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

async function createPDF() {
  // 创建一个新的PDF文档
  const pdfDoc = await PDFDocument.create();

  // 图片所在目录
  const imageDir = './images';

  for (let i = 0; i < 738; i++) {
    const imageNumber = String(i).padStart(3, '0'); // 格式化为三位编号
    const imagePath = path.join(imageDir, `${imageNumber}.jpg`);

    // 读取图片数据
    const imageBytes = fs.readFileSync(imagePath);

    // 嵌入图像到PDF
    const jpgImage = await pdfDoc.embedJpg(imageBytes);
    const jpgDims = jpgImage.scale(1); // 按原尺寸嵌入

    // 添加新页面并在页面上绘制图片
    const page = pdfDoc.addPage([jpgDims.width, jpgDims.height]);
    page.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width: jpgDims.width,
      height: jpgDims.height,
    });
  }

  // 保存PDF文件
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('output.pdf', pdfBytes);

  console.log('PDF已生成: output.pdf');
}

createPDF().catch(err => console.error(err));
