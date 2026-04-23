import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* Bootstrap first, then our theme — order matters so index.css wins over reboot */
import 'bootstrap/dist/css/bootstrap.min.css'
import 'lenis/dist/lenis.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
