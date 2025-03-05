const express = require("express");
const axios = require("axios");
const cors = require("cors");
const xml2js = require("xml2js"); // For parsing XML

const app = express();
app.use(cors()); // Enable CORS for Shopify

const PORT = process.env.PORT || 3000;

// Murphy API Credentials (set in Render's Environment Variables)
const MURPHY_USERNAME = process.env.MURPHY_USERNAME;
const MURPHY_PASSWORD = process.env.MURPHY_PASSWORD;
const MURPHY_API_URL = "http://ws.murphysmagic.com/V4.asmx";

// Function to fetch a fresh signed video URL
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

        console.log("🔍 Murphy API Raw XML Response:\n", response.data); // Log full XML

        // Try to extract the signed video URL
        const signedVideoUrl = extractSignedVideoUrl(response.data);
        
        if (!signedVideoUrl) {
            console.error("❌ No video URL found in API response.");
        }

        return signedVideoUrl || null;
    } catch (error) {
        console.error("❌ Error fetching video URL from Murphy API:", error);
        return null;
    }
}


// Function to extract the signed video URL from Murphy's API response
function extractSignedVideoUrl(xmlResponse) {
    let videoUrl = null;
    xml2js.parseString(xmlResponse, { explicitArray: false }, (err, result) => {
        if (err) {
            console.error("❌ XML Parsing Error:", err);
            return;
        }

        try {
            console.log("🔍 Parsed XML Object:", JSON.stringify(result, null, 2)); // Log the full structure

            // Navigate to InventoryItem safely
            const inventoryItem = result?.["soap:Envelope"]?.["soap:Body"]?.["GetInventoryItemsResponse"]?.["items"]?.["InventoryItem"];

            if (!inventoryItem) {
                console.error("❌ No InventoryItem found in response.");
                return;
            }

            // Check if `Videos` exists
            const videoData = inventoryItem?.["Videos"]?.["Video"];

            if (videoData && videoData.VideoURL) {
                videoUrl = videoData.VideoURL; // ✅ Use full signed VideoURL if available
            } else {
                console.warn("⚠️ No `<VideoURL>` found. This product may not have a video.");
            }
        } catch (e) {
            console.error("❌ Error extracting VideoURL:", e);
        }
    });

    console.log("✅ Extracted Video URL:", videoUrl);
    return videoUrl;
}

// API endpoint to get the fresh Murphy video
app.get("/get-murphy-video", async (req, res) => {
    const productId = parseInt(req.query.product_id, 10); // Convert to integer
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const videoURL = await getFreshVideoURL(productId);
    if (!videoURL) return res.status(500).json({ error: "Failed to fetch video URL" });

    res.json({ video_url: videoURL });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
