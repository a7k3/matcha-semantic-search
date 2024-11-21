async function search() {
    const query = document.getElementById('searchInput').value;
    const resultsDiv = document.getElementById('results');
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        resultsDiv.innerHTML = data.map(hit => `
            <div class="result-item">
                <h3><a href="${hit._source.url}" target="_blank">${hit._source.title}</a></h3>
                <p>${hit._source.content.substring(0, 200)}...</p>
            </div>
        `).join('');
    } catch (error) {
        resultsDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

let progressInterval;

async function startScraping() {
    try {
        await fetch('/api/scrape', { method: 'POST' });
        startProgressChecking();
    } catch (error) {
        console.error('Error starting scrape:', error);
    }
}

async function checkProgress() {
    try {
        const response = await fetch('/api/scrape/progress');
        const progress = await response.json();
        
        const progressDiv = document.getElementById('scraping-progress');
        progressDiv.innerHTML = `
            Status: ${progress.status}<br>
            Articles found: ${progress.total}<br>
            Scraped: ${progress.scraped}<br>
            Indexed: ${progress.indexed}
        `;

        if (progress.status === 'completed' || progress.status === 'error') {
            clearInterval(progressInterval);
        }
    } catch (error) {
        console.error('Error checking progress:', error);
    }
}

function startProgressChecking() {
    progressInterval = setInterval(checkProgress, 1000);
}