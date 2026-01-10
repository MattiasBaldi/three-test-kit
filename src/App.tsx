import { Canvas } from '@react-three/fiber'
import TestKit, { Kit } from './TestKit'

export default function App() {

  return (
      <Canvas style={{width: "100vw", height: "100vh", position: "fixed", zIndex: 1, left: "0", top: "0"}}>
        <TestKit  />
      </Canvas>

  )
}
