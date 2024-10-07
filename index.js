import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors'

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors())

// Middleware to parse JSON requests
app.use(express.json());

app.post('/screenshot', async (req, res) => {
  const { url, devices } = req.body;

  let browser;
  
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, use the installed Chromium on EC2
      browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser', // Path to Chromium installed on EC2
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for some EC2 environments
      });
    } else {
      // In development, dynamically import puppeteer
      const puppeteerDev = await import('puppeteer');
      browser = await puppeteerDev.launch({ headless: true });
    }

    const screenshots = [];

    for (const device of devices) {
      const page = await browser.newPage();

      // Set viewport size based on device
      if (device === 'desktop') {
        await page.setViewport({ width: 1920, height: 1080 });
      } else if (device === 'tablet') {
        await page.setViewport({ width: 768, height: 1024 });
      } else if (device === 'mobile') {
        await page.setViewport({ width: 375, height: 667 });
      }

      await page.goto(url, { waitUntil: 'networkidle2' });

      const screenshot = await page.screenshot({ encoding: 'base64' });
      screenshots.push({
        device,
        url: `data:image/png;base64,${screenshot}`,
      });

      await page.close();
    }

    await browser.close();

    return res.status(200).json({ screenshots });
  } catch (error) {
    console.error('Error generating screenshots:', error);
    return res.status(500).json({ error: 'Failed to generate screenshots' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
