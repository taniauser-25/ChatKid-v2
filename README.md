# ChatKid Prototype

ChatKid is a research prototype of a child-centered chatbot designed to support children’s everyday questions in a safe and age-appropriate way. The system combines a rule-based safety layer with a local language model to provide child-friendly responses while maintaining clear boundaries and encouraging parent involvement.

## Features

- Child-friendly chatbot interaction
- Rule-based detection of restricted or sensitive topics
- Warning prompt for restricted questions
- Parent notification prototype flow
- Local LLM-based response generation for safe inputs
- Simple and interactive user interface for children

## Technologies Used

- HTML
- CSS
- JavaScript
- Ollama
- llama3.2:1b local language model

## Requirements

Before running the prototype, make sure you have:

- Visual Studio Code installed
- A modern web browser such as Google Chrome
- Ollama installed on your computer
- The `llama3.2:1b` model downloaded locally

### 1. Visual Studio Code

Visual Studio Code is used to open and run the project files.

- Download and install **Visual Studio Code**
- Open the ChatKid Prototype project folder inside VS Code

### 2. A Modern Web Browser

You will need a browser to open and use the prototype.

Supported browser:

- Google Chrome

Using the latest version of the browser is recommended for the best performance.

### 3. Ollama Installed on Your Computer

ChatKid uses **Ollama** to run the language model locally on your machine. This means the chatbot does not depend on an online API. Instead, it connects to a local API running on your computer.

#### To set up Ollama

1. Download and install **Ollama**
2. After installation, open a terminal and make sure Ollama is available
3. Make sure Ollama is running on your computer

### 4. Download the Required Model

Open a terminal in Visual Studio Code and run:

```bash
ollama pull llama3.2:1b
```

This command downloads the required model to your local machine.
Or, 
You can find the `llama3.2:1b` model by searching for it in Ollama and download it manually.

## Step-by-Step Instructions to Run ChatKid

Follow these steps to run the prototype:

### Step 1: Open the project in Visual Studio Code

Open the **ChatKid** project folder in **Visual Studio Code**.

### Step 2: Make sure Ollama is installed and running

Install **Ollama** on your computer if it is not already installed.

Make sure Ollama is running locally.

### Step 3: Download the required model

Open a terminal in **Visual Studio Code** and run:

```bash
ollama pull llama3.2:1b
```

### Step 4: Open a new terminal in VS Code

In **Visual Studio Code**, open a **new terminal**.

### Step 5: Run the local server

In the new terminal, run:

```bash
python -m http.server 8000 -d docs
```

This starts a local server using the `docs` folder.

### Step 6: Open the prototype in your browser

After the server starts, open your browser and go to:

```text
http://127.0.0.1:8000/
```

### Step 7: Start using ChatKid

You can now interact with the chatbot in your browser.

- If the question is allowed, ChatKid will respond.
- If the question is restricted, ChatKid will show a warning and give the option to notify a parent.



## Running ChatKid Online (no Ollama needed)

ChatKid can now run from a website, such as GitHub Pages. By default it uses **WebLLM**, which runs the model (`Llama-3.2-3B-Instruct`) inside the child's browser. There is no server and no API key, and children's messages never leave the computer.

### Publish on GitHub Pages
1. Push these files to your GitHub repository.
2. On GitHub, go to **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save.
3. After a minute, ChatKid is live at `https://<your-username>.github.io/<repo-name>/`.

### Requirements for the computer that opens ChatKid
- **Google Chrome or Microsoft Edge** on a laptop or desktop (the browser needs WebGPU).
- The **first visit downloads the model (about 2 GB)**. Open ChatKid on each session laptop before the session so it is cached. Later visits load in seconds.
- On weaker laptops, use the smaller model by adding `?model=Llama-3.2-1B-Instruct-q4f16_1-MLC` to the URL.

### Other ways to run it
- Local Ollama (the original setup): open with `?provider=ollama`.
- Hosted model through your own server: see `server/cloudflare-worker.js`, then open with `?provider=proxy`.

## Kids' Rulebook

ChatKid follows 14 rules written by children in a KidsTeam session (2026-11-05). They are in `KIDS_RULEBOOK` in `app.js`.
