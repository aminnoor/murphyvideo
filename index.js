const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio"); // For web scraping
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
    try {
        const url = `https://www.murphysmagic.com/product.aspx?id=${productId}`;
        const headers = { "User-Agent": "Mozilla/5.0" };

        // Fetch the product page HTML
        const response = await axios.get(url, { headers });

        // Load the HTML into Cheerio for parsing
        const $ = cheerio.load(response.data);

        // Extract the video URL using regex (like in your Python script)
        const videoMatch = response.data.match(/ProductPageVidify\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"(https:\/\/[^"]+)"/);

        if (videoMatch) {
            return videoMatch[4]; // Extracted video URL
        } else {
            console.warn("⚠️ No video found on the Murphy product page.");
            return null;
        }
    } catch (error) {
        console.error("❌ Error scraping Murphy video URL:", error);
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
