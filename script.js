const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

const API_KEY = "AIzaSyBY-rofFqZ4L8292pJgKTbQXlIB-JTedOI";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
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
const typeText = (element, text, delay = 10) => {
    let index = 0;
    element.textContent = ""; // Clear the initial text

    // Clear any existing interval
    if (typingInterval) {
        clearInterval(typingInterval);
    }

    // Start a new interval
    typingInterval = setInterval(() => {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            scrollToBottom();
        } else {
            clearInterval(typingInterval); // Clear the interval when done
            typingInterval = null; // Reset the interval variable
            document.body.classList.remove("bot-responding");
        }
    }, delay);
};
//generate bot response
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
    textElement.textContent = "Just a sec..."; // Initial message

    // Add user message to the chat history
    chatHistory.push({
        role: "user",
        parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])]
    });

    try {
        // Abort any existing request
        if (controller) {
            controller.abort();
        }

        // Create a new AbortController
        controller = new AbortController();

        // Set a timeout for the API call (e.g., 10 seconds)
        const timeout = 10000; // 10 seconds
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
        // console.error("Error generating response:", error);
        textElement.style.color = "#d62939";
        textElement.textContent = error.name === "AbortError" ? "Response generate stopped." : error.message;
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
        scrollToBottom();

        // Stop the avatar animation in case of error
        const avatar = botMsgDiv.querySelector(".avatar");
        if (avatar) {
            avatar.classList.remove("loading");
        }

        // Handle specific errors
        if (error.name === "AbortError") {
            // Do nothing, just stop the response
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
    } finally {
        userData.file = {};
        controller = null; // Reset the controller
    }
};

//Handle the form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if(!userMessage || document.body.classList.contains("bot-responding")) return;

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding", "chats-active")
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

// Stop bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    if (controller) {
        controller.abort(); // Abort the ongoing fetch request
    }
    if (typingInterval) {
        clearInterval(typingInterval); // Clear the typing effect interval
        typingInterval = null; // Reset the interval variable
    }

    // Remove the loading state from the bot's message
    const botMsgDiv = document.querySelector(".bot-message.loading");
    if (botMsgDiv) {
        botMsgDiv.classList.remove("loading"); // Remove loading state
        document.body.classList.remove("bot-responding");
    }
});

//delete chat
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("bot-responding", "chats-active");
});


//handle suggestion clicks
document.querySelectorAll(".suggestion-item").forEach(item => {
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});

//show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controks")&&(target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
});

//toggle between light and dark mode
themeToggle.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

//set initial theme from local storage
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());