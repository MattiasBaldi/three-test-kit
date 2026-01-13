import { Canvas } from '@react-three/fiber'
import TestKit from './Kit/TestKit'
import { OrbitControls } from '@react-three/drei'

export default function App() {

  return (
      <Canvas style={{width: "100vw", height: "100vh", position: "fixed", zIndex: 1, left: "0", top: "0"}}>
          <OrbitControls />
        <TestKit  />
      </Canvas>

  )
}
