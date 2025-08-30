# React + TypeScript + Vite + Electron + Ollama

This repo aims to get started building a local and private AI-powered desktop app quickly. It runs an LLM as a standalone desktop app
This template is for electron + react + TypeScript + Ollama + sqlite3 + Chakra UI right now, I will integrate with LangChain later on.

<!-- <div align="center">
    <img src="./screenshots/UI.png" width="100%">
</div> -->

## Development

```bash
npm install
npm run dev
```

## Ollama

In order to run Ollama privately, you need to download and copy latest Ollama binary executable to the `/src/electron/service/ollama/runners` directory.

# Note
you need to run `npm run rebuild`. This is required to run better-sqlite3 if you're facing any issues where the node versions don't match. 