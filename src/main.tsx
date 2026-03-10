import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Root element not found')
  
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
} catch (error) {
  console.error('Failed to render app:', error)
  document.body.innerHTML = `
    <div style="padding: 20px; color: red">
      <h1>Application Error</h1>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <p>Check console for details</p>
    </div>
  `
}
