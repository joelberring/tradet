import './App.css'
import { Viewport } from './components/Viewport'
import { Controls } from './components/Controls'

function App() {
  return (
    <div className="app-container">
      <Controls />
      <Viewport />
    </div>
  )
}

export default App
