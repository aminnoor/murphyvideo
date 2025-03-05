const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors()); // Allow requests from Shopify

const PORT = process.env.PORT || 3000;

// Murphy API Credentials (Should be set in Environment Variables on Render)
const MURPHY_USERNAME = process.env.MURPHY_USERNAME;
const MURPHY_PASSWORD = process.env.MURPHY_PASSWORD;
const MURPHY_API_URL = "http://ws.murphysmagic.com/V4.asmx";

// Function to fetch fresh video URL
async function getFreshVideoURL(productId) {
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Header>
        <SoapAuthenticationHeader xmlns="http://webservices.murphysmagicsupplies.com/">
          <Username>${MURPHY_USERNAME}</Username>
          <Password>${MURPHY_PASSWORD}</Password>
        </SoapAuthenticationHeader>
      </soap:Header>
      <soap:Body>
        <GetInventoryItems xmlns="http://webservices.murphysmagicsupplies.com/">
          <itemKeys>
            <int>${productId}</int>
          </itemKeys>
        </GetInventoryItems>
      </soap:Body>
    </soap:Envelope>`;

    try {
        const response = await axios.post(
            MURPHY_API_URL,
            soapRequest,
            { headers: { "Content-Type": "text/xml", "SOAPAction": "http://webservices.murphysmagicsupplies.com/GetInventoryItems" } }
        );

        // Extract video URL from response XML (you may need to parse this properly)
        return `https://d29xpwypni02ry.cloudfront.net/clips_mp4fs/${productId}-video1.mp4`; // Example URL
    } catch (error) {
        console.error("Error fetching video URL:", error);
        return null;
    }
}

// API endpoint to get the fresh video
app.get("/get-murphy-video", async (req, res) => {
    const productId = req.query.product_id;
    if (!productId) return res.status(400).json({ error: "Missing product ID" });

    const videoURL = await getFreshVideoURL(productId);
    res.json({ video_url: videoURL });
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
