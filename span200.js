import puppeteer from "puppeteer"; // 替换 require 为 import
import fs from "fs"; // 替换 require 为 import
import fetch from "node-fetch"; // 替换 require 为 import
import dotenv from "dotenv"; // 替换 require 为 import

dotenv.config(); // 加载 .env 文件

// console.log("Username: ", process.env.MY_APP_USERNAME);
// console.log("Password: ", process.env.MY_APP_PASSWORD);

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // 设置视口为4K分辨率，并设置设备像素比
  await page.setViewport({
    width: 1080, //  宽度
    height: 1960, //  高度
    deviceScaleFactor: 2, // 高像素比，类似于 Retina 屏幕
  });

  const goToPage = async function name(url) {
    await page.goto(url);
  };

  // 函数：下载图片并保存
  const downloadImage = async function (imageUrl, filename, page) {
    // 确保 page 对象有效
    if (!page || typeof page.cookies !== "function") {
      console.error("Invalid page object. Cannot retrieve cookies.");
      return;
    }

    // 获取当前页面的 Cookie
    const cookies = await page.cookies();
    const cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    // 发送带有 Cookie 的请求
    const response = await fetch(imageUrl, {
      headers: {
        Cookie: cookieString,
        "User-Agent": await page.evaluate(() => navigator.userAgent), // 模仿浏览器的User-Agent
        Referer: page.url(), // 设置 Referer 为当前页面的 URL
      },
    });

    // 检查响应状态
    if (!response.ok) {
      console.error(`下载失败: ${response.statusText}`);
      return;
    }

    // 检查内容类型是否为图片
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.error("内容类型不是图片:", contentType);
      return;
    }

    // 读取图片数据
    const buffer = await response.arrayBuffer();

    // 保存图片
    fs.writeFileSync(filename, Buffer.from(buffer));
    console.log(`图片下载并保存为 ${filename}`);
  };

  await goToPage("https://www.vhlcentral.com");

  // 登录
  await page.waitForSelector("#user_session_username");
  await page.type("#user_session_username", process.env.SPAN200_USERNAME);

  await page.waitForSelector("#user_session_password");
  await page.type("#user_session_password", process.env.SPAN200_PASSWORD);

  await page.click('input[type="submit"][value="Login"]');

  await goToPage(
    "https://reader.vhlcentral.com/vistas6e/student-edition/vis6e_vtext?rid=1693148#/book/vis6e_vtext"
  );

  // 全屏显示
  await page.waitForSelector('div#fullscreen span');
  await page.click('div#fullscreen span')

  // 确保单页显示
  await page.waitForSelector(
    "i.dls-reader-font.dls-reader-single-page.single-page"
  );
  await page.click("i.dls-reader-font.dls-reader-single-page.single-page");

  for (let i = 0; i < 738; i++) {
    // 获取图片的 src
    const imageUrl = await page.evaluate(() => {
      const imgElement = document.querySelector("img.imageLayer.readerpagediv");
      return imgElement ? imgElement.src : null;
    });

    if (imageUrl) {
      // 定义图片的保存路径和文件名，例如 "001.jpg", "002.jpg", "003.jpg"...
      const filename = `./images/${String(i).padStart(3, "0")}.jpg`;

      // 下载并保存图片
      await downloadImage(imageUrl, filename, page);
    } else {
      console.log(`第 ${i} 页没有找到图片`);
    }

    await page.waitForSelector(
      "i.dls-reader-font.dls-reader-single-page.single-page"
    );
    await page.click("i.dls-reader-font.dls-reader-single-page.single-page");

    // 点击下一页
    await page.waitForSelector(
      "span.custom-tooltip.hover-active.next-page.ng-scope.tooltipstered"
    );
    await page.click(
      "span.custom-tooltip.hover-active.next-page.ng-scope.tooltipstered"
    );

    // 给下一页时间加载
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2秒
  }

  // 等待页面导航或进一步操作
  await page.waitForNavigation();

  await browser.close();
})();
