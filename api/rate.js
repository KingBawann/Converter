module.exports = async (req, res) => {
    try {
        // Fetch directly from Telegram on the Vercel backend
        const response = await fetch('https://t.me/s/USD_IQD', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch from Telegram: ${response.status}`);
        }
        
        const html = await response.text();
        const match = html.match(/(?:1[.,]?5\d{2})/g);
        
        let rate = 1532; // Default fallback
        
        if (match && match.length > 0) {
            const latestMatch = match[match.length - 1];
            rate = parseFloat(latestMatch.replace(/[,.]/g, ''));
        }
        
        // Cache this response on Vercel's Edge Network for 60 seconds
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json({ rate: rate });
        
    } catch (error) {
        console.error('Error scraping rate:', error);
        res.status(500).json({ error: 'Failed to fetch rate', fallbackRate: 1532 });
    }
};
