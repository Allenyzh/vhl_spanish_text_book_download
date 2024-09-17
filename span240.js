import puppeteer from "puppeteer";
import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv"; // 替换 require 为 import

dotenv.config(); // 加载 .env 文件

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // 设置视口为4K分辨率，并设置设备像素比
  await page.setViewport({
    width: 1080, //  宽度
    height: 1960, //  高度
    deviceScaleFactor: 2, // 高像素比，类似于 Retina 屏幕
  });

  const goToPage = async function (url) {
    await page.goto(url, { waitUntil: "networkidle2" }); // 确保页面完全加载
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

  // 打开登录页面并登录
  await goToPage("https://www.vhlcentral.com");

  await page.waitForSelector("#user_session_username");
  await page.type("#user_session_username", process.env.SPAN240_USERNAME);

  await page.waitForSelector("#user_session_password");
  await page.type("#user_session_password", process.env.SPAN240_PASSWORD);

  await page.click('input[type="submit"][value="Login"]');

  // 导航到指定的阅读页面
  await goToPage(
    "https://reader3.vhlcentral.com/experiencias2eintermediate/student-edition/eis2e_vtext?rid=1699521&page=cover"
  );

  // 确保单页显示
  await page.waitForSelector(
    "div.MuiBox-root.jss37.StyledToolBox-sc-phsbg4.StyledToggleButtonBox-sc-1vd15zh.iHaUjx.cXGyJe button.MuiButtonBase-root.MuiIconButton-root.sc-iuStju.hqPaAt"
  );
  await page.click(
    "div.MuiBox-root.jss37.StyledToolBox-sc-phsbg4.StyledToggleButtonBox-sc-1vd15zh.iHaUjx.cXGyJe button.MuiButtonBase-root.MuiIconButton-root.sc-iuStju.hqPaAt"
  );

  for (let i = 0; i < 738; i++) {
    // 确保图片元素加载完成
    try {
      await page.waitForSelector("img.imageLayer.readerpagediv", {
        timeout: 10000,
      });
    } catch (error) {
      console.log(`第 ${i} 页没有找到图片或超时。`);
      continue; // 跳过这页，继续下一页
    }

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
      "div.MuiBox-root.jss37.StyledToolBox-sc-phsbg4.StyledToggleButtonBox-sc-1vd15zh.iHaUjx.cXGyJe button.MuiButtonBase-root.MuiIconButton-root.sc-iuStju.hqPaAt"
    );
    await page.click(
      "div.MuiBox-root.jss37.StyledToolBox-sc-phsbg4.StyledToggleButtonBox-sc-1vd15zh.iHaUjx.cXGyJe button.MuiButtonBase-root.MuiIconButton-root.sc-iuStju.hqPaAt"
    );

    // 点击下一页
    try {
      await page.waitForSelector(
        "div.MuiBox-root.jss51.StyledToolBox-sc-phsbg4.hutcUZ button.MuiButtonBase-root.MuiIconButton-root.sc-iuStju.kYwJGl",
        { timeout: 0 }
      );
      await page.click(
        "div.MuiBox-root.jss51.StyledToolBox-sc-phsbg4.hutcUZ button.MuiButtonBase-root.MuiIconButton-root.sc-iuStju.kYwJGl"
      );
    } catch (error) {
      console.log("无法找到下一页按钮或超时，停止循环。");
      break; // 停止循环
    }

    // 给下一页时间加载
    await new Promise((resolve) => setTimeout(resolve, 1500)); // 2秒
  }

  console.log("图片下载完成");
  await browser.close();
})();
