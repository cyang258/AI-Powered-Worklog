import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { useEffect, useState } from "react";

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setIsLoading(true)
    // 1. Start the Ollama server
    window.API.ollama.serveOllama();
    // 2. Run the model
    window.API.ollama.onOllamaServe((_, data) => {
      if (!data.success) {
        setIsLoading(false)
        const statusMsg = "Error: " + (data.content || "Unknown error occurred.");
        setError(statusMsg)
        return;
      }
      if (data.content === "system") {
        // Ollama was already running, and we just connected to it, let the user know
        console.log("Ollama already running");
      }
      window.API.ollama.runOllama();
    });
    // 3. Monitor the run status
    window.API.ollama.onOllamaRun((_, data) => {
      if (!data.success) {
        setIsLoading(false);
        const statusMsg = "Error: " + data.content;
        setError(statusMsg)
        return;
      }
      if (data.content.done) {
        // 4. Load the chat
        setIsLoading(false)
        setTimeout(() => {
          window.API.ollama.sendCommand(['./public/animal.jpg']);
          window.API.ollama.sendPrompt('tell me a joke');
        }, 500);
        return;
      }
      setMsg(data.content)
    });
  }, [])
  return (
    <Router>
      <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage isLoading={isLoading} error={error} msg={msg}/>} />
          </Routes>
      </div>
    </Router>
  );
};
export default App;