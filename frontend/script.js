document.addEventListener('DOMContentLoaded', () => {
    const websiteUrlInput = document.getElementById('websiteUrl');
    const addWebsiteBtn = document.getElementById('addWebsiteBtn');
    const websitesListDiv = document.getElementById('websitesList');

    addWebsiteBtn.addEventListener('click', () => {
        const url = websiteUrlInput.value.trim();
        if (url) {
            addWebsite(url);
            websiteUrlInput.value = '';
        }
    });

    function addWebsite(url) {
        fetch('/api/websites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        })
        .then(response => {
            return response.json().then(data => ({ response: response, data: data }));
        })
        .then(({ response, data }) => {
            if (response.ok) {
                console.log('Website added:', data);
                fetchWebsites();
            } else {
                alert(data.message || 'Failed to add website.');
            }
        })
        .catch(error => {
            console.error('Error adding website:', error);
            alert('Error adding website.');
        });
    }

    function fetchWebsites() {
        websitesListDiv.innerHTML = ''; // Clear current list
        fetch('/api/websites')
        .then(response => response.json())
        .then(websites => {
            websites.forEach(website => {
                const websiteDiv = document.createElement('div');
                websiteDiv.classList.add('website-item');
                websiteDiv.innerHTML = `
                    <div class="website-url">${website.url}</div>
                    <div class="change-history" id="history-${website.id}">
                        <button onclick="fetchHistory(${website.id})">Show Change History</button>
                    </div>
                `;
                websitesListDiv.appendChild(websiteDiv);
            });
        })
        .catch(error => {
            console.error('Error fetching websites:', error);
            alert('Error fetching websites.');
        });
    }

    window.fetchHistory = function(websiteId) {
        const historyDiv = document.getElementById(`history-${websiteId}`);
        historyDiv.innerHTML = 'Loading history...';
        fetch(`/api/websites/${websiteId}/history`)
        .then(response => response.json())
        .then(history => {
            let historyText = 'No changes recorded.';
            if (history.length > 0) {
                historyText = '<ul>';
                history.forEach(item => {
                    historyText += `<li>${item.date}: ${item.diff ? 'Changes detected' : 'No changes'}</li>`;
                });
                historyText += '</ul>';
            }
            historyDiv.innerHTML = `Change History: ${historyText}`;
        })
        .catch(error => {
            console.error('Error fetching history:', error);
            historyDiv.innerHTML = 'Error loading history.';
        });
    };

    fetchWebsites(); // Initial load of websites
});
