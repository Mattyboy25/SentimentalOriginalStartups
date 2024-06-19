document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('questionForm');
    const generateButton = document.querySelector('.btn[type="submit"]');
    const copyButton = document.getElementById('copyButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const responseContainer = document.getElementById('responseContainer');

    // Disable the copy button initially
    copyButton.disabled = true;

    form.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the default form submission behavior

        const questionInput = document.getElementById('questionInput');
        const question = questionInput.value;

        // Disable the generate button to prevent multiple clicks
        generateButton.disabled = true;
        setTimeout(() => {
            generateButton.disabled = false;
        }, 3500); // Re-enable the button after 2.5 seconds
        
        // Show the loading indicator and grey out the response container
        loadingIndicator.style.display = 'flex';
        responseContainer.classList.add('loading');
        responseContainer.innerHTML = '<span class="blinking-cursor"></span>'; // Initial blinking cursor

        // Send the data to the server using Fetch API
        fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: question })
        })
        .then(response => response.json())
        .then(data => {
            const streamUrl = data.streamUrl;
            responseContainer.innerHTML = ''; // Clear previous response

            // Disable copy button when starting new request
            copyButton.disabled = true;

            // Open the SSE connection
            const eventSource = new EventSource(streamUrl);

            let fullResponse = ''; // Initialize a variable to hold the full response

            eventSource.onmessage = function(event) {
                const newContent = event.data;
                if (newContent !== "[DONE]") {
                    fullResponse += newContent;
                    responseContainer.innerHTML = formatResponse(fullResponse) + '<span class="blinking-cursor"></span>'; // Update the container with the formatted response and cursor
                    responseContainer.scrollTop = responseContainer.scrollHeight; // Auto-scroll to the bottom
                    // Enable copy button if there's content
                    copyButton.disabled = fullResponse.trim() === '';
                }
            };

            eventSource.addEventListener('end', function() {
                eventSource.close();
                // Hide the loading indicator and un-grey the response container
                loadingIndicator.style.display = 'none';
                responseContainer.classList.remove('loading');
                // Remove the cursor at the end
                responseContainer.innerHTML = formatResponse(fullResponse);
                // Enable the copy button if the response is not empty
                copyButton.disabled = fullResponse.trim() === '';
            });

            eventSource.onerror = function(error) {
                console.error('EventSource error:', error);
                eventSource.close();
                // Hide the loading indicator and un-grey the response container
                loadingIndicator.style.display = 'none';
                responseContainer.classList.remove('loading');
            };
        })
        .catch(error => {
            console.error('Fetch error:', error);
            alert('Error: ' + error.message);
            // Hide the loading indicator and un-grey the response container
            loadingIndicator.style.display = 'none';
            responseContainer.classList.remove('loading');
        });
    });

    copyButton.addEventListener('click', function() {
        const text = responseContainer.innerText; // Get text content from the response container

        navigator.clipboard.writeText(text).then(function() {
            alert('Response copied to clipboard!');
        }, function(err) {
            console.error('Could not copy text: ', err);
        });
    });

    function formatResponse(text) {
        // Replace markers with HTML elements
        let formattedText = text
            .replace(/\*\*Continuation of Service Note for Ty\*\*/g, '<h2>Continuation of Service Note for Ty</h2>')
            .replace(/\*\*Observations of the Session:\*\*/g, '<h3>Observations of the Session:</h3>')
            .replace(/\*\*Behavioral Observations:\*\*/g, '<h3>Behavioral Observations:</h3>')
            .replace(/\*\*Support and Intervention:\*\*/g, '<h3>Support and Intervention:</h3>')
            .replace(/\*\*Support Strategies:\*\*/g, '<h3>Support Strategies:</h3>')
            .replace(/\*\*Goals for Future Sessions:\*\*/g, '<h3>Goals for Future Sessions:</h3>')
            .replace(/\*\*Summary:\*\*/g, '<h3>Summary:</h3>')
            .replace(/-\s\*\*(.+?)\*\*/g, '<li><strong>$1</strong></li>')  // List items with bold text
            .replace(/\n/g, '<br>');  // Replace new lines with <br> for HTML

        return formattedText;
    }
});