const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");

const API_KEY = "AIzaSyBY-rofFqZ4L8292pJgKTbQXlIB-JTedOI";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const chatHistory = [];
const userData = { message: "", file: {} };

//Function to create message elements 
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

//Scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

//function to simulate typingeffect as bot replies
const typeText = (element, text, delay=10) => {
    let index = 0;
    element.textContent = ""; //clear the inittial text

    const typingInterval = setInterval(() => {
        if(index <  text.length) {
            element.textContent += text.charAt(index);

            index++;
            scrollToBottom();
        }else{
            clearInterval(typingInterval);
        }
    }, delay);
};

const generateResponse = async (botMsgDiv, retryCount = 0) => {
    if (!botMsgDiv) {
        console.error("botMsgDiv is null or undefined");
        return;
    }

    let textElement = botMsgDiv.querySelector(".message-text");
    if (!textElement) {
        textElement = document.createElement("div");
        textElement.className = "message-text";
        botMsgDiv.appendChild(textElement);
    }
    textElement.textContent = "just a sec..."; // Initial message

    // Add user message to the chat history
    chatHistory.push({
        role: "user",
        parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest}) => rest)(userData.file) }] : [])]
    });

    try {
        // Set a timeout for the API call (e.g., 10 seconds)
        const timeout = 10000; // 10 seconds
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Send the chat history to the API to get a response
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal, // Add timeout signal
        });
        clearTimeout(timeoutId); // Clear the timeout if the request completes

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "API request failed");

        // Process the response text
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            throw new Error("Invalid API response structure");
        }

        // Stop the avatar animation
        const avatar = botMsgDiv.querySelector(".avatar");
        if (avatar) {
            avatar.classList.remove("loading");
        }

        // Display the response with a typing effect
        typeText(textElement, responseText.replace(/\*\*([^*]+)\*\*/g, "$1").trim());

        chatHistory.push({ role: "model", parts: [{ text: responseText }] });

    } catch (error) {
        console.error("Error generating response:", error);

        // Stop the avatar animation in case of error
        const avatar = botMsgDiv.querySelector(".avatar");
        if (avatar) {
            avatar.classList.remove("loading");
        }

        // Handle specific errors
        if (error.name === "AbortError") {
            textElement.textContent = "Request timed out. Please try again.";
        } else if (error.message.includes("overloaded")) {
            if (retryCount < 3) { // Retry up to 3 times
                textElement.textContent = `Model is overloaded. Retrying (${retryCount + 1}/3)...`;
                setTimeout(() => generateResponse(botMsgDiv, retryCount + 1), 2000); // Retry after 2 seconds
            } else {
                textElement.textContent = "The model is still overloaded. Please try again later.";
            }
        } else {
            textElement.textContent = "Sorry, something went wrong. Please try again.";
        }
    }finally{
        userData.file = {};
    }
};

//Handle the form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if(!userMessage) return;

    promptInput.value = "";
    userData.message = userMessage;
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

    //generate user message HTML and add in the chats container
    const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attached" />` : `<p class="file-attached"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
    `;
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");

    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        //generate bot message HTML and add in the chats conatiner after 500ms
        const botMsgHTML = `<img src="avatar.svg" class="avatar loading"><p class="message-text">Just a sec...</p>`;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv); 
    }, 200)


}

// Handle file input change (file upload)
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if(!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1]
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        //Store file data in userData obj
        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
    }
});

//cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());