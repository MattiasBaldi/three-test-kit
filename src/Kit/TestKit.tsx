import { Html, Center, useEnvironment, useCursor } from '@react-three/drei'
import { Suspense, useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { LoadingManager, Mesh, Raycaster, Texture, TextureLoader, Vector2, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useLoader, useThree } from '@react-three/fiber'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { Ui } from './Ui'
import { type AssetData } from './api'
import { create } from 'zustand'

const queryClient = new QueryClient()

interface LoadState {
  manager: LoadingManager
  progress: number
}

export const useLoadingStore = create<Record<string, LoadState>>(() => ({}))

// 3D Scene Component - renders inside Canvas
export default function TestKit()
{
    const [settings, setSettings] = useState(null)
    const [env, setEnv] = useState<AssetData | null>(null)
    const [texture, setTexture] = useState<AssetData | null>(null)
    const [model, setModel] = useState<AssetData | null>(null)
 
    return (
        <>

      {/* Models */}
        {model &&
          <Suspense>
            <Center>
              <Model data={model}/>
            </Center>
         </Suspense>
        }

      {/* Environment */}
        {env &&
          <Suspense>
            <Env data={env}/>
          </Suspense>
        }

        {/* Textures */}
         {texture &&
          <Suspense>
            <Tex data={texture}/>
          </Suspense>
          }

          {/* Ui */}
            <Html>
              <QueryClientProvider client={queryClient}>
                <Ui props={{ setEnv, setTexture, setModel }} />
             </QueryClientProvider>
            </Html>
        </>
    )
}

function Model({ data }: { data: AssetData }) {
  const includes = data.files?.gltf?.["1k"]?.gltf?.include
  const url = data.files?.gltf?.["1k"]?.gltf?.url
  const id = data.id

  const manager = useManager(id, includes)
  const gltf = useLoader(GLTFLoader, url || '', (loader) => { if (manager) loader.manager = manager }) //prettier-ignore

  if (!url || !gltf) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <primitive object={(gltf as any).scene} />
}

function Env({ data }: { data: AssetData }) {

  const { scene } = useThree()
  const url = data.files?.hdri?.["1k"]?.hdr?.url
  const id = data?.id

  const manager = useManager(id)
  const env = useEnvironment({ files: url, extensions: (loader) => { loader.manager = manager}})
  useEffect(() => {scene.environment = env; scene.background = env}, [env, scene])

  return null; 
}

const texLoader = new TextureLoader()

function Tex({ data }: { data: AssetData }) {


  const manager = useManager(data.id)

  const textureUrls = useMemo(() => ({
    Diffuse: data.files?.Diffuse?.["1k"]?.png?.url,
    Arm: data.files?.arm?.["1k"]?.png?.url,
    NorGL: data.files?.["nor_gl"]?.["1k"]?.png?.url,
    Displacement: data.files?.Displacement?.["1k"]?.png?.url,
    AO: data.files?.AO?.["1k"]?.png?.url,
    Rough: data.files?.Rough?.["1k"]?.png?.url,
  }), [data])

  const texs = useLoader(texLoader, Object.values(textureUrls), loader => { if (manager) loader.manager = manager }) //prettier-ignore (use custom loader)

  const texMap = useMemo(() => {
    const keys = Object.keys(textureUrls)
    return keys.reduce<Record<string, Texture | null>>((acc, k, i) => {
      acc[k] = texs[i] || null
      return acc
    }, {})
  }, [texs, textureUrls])

  const { camera, scene, gl } = useThree()
  const canvas = gl.domElement

  const hovered = useRef<Mesh | null>(null)
  const selected = useRef<Mesh | null>(null)
  const originalScale = useRef<Vector3 | null>(null)

  const raycaster = useMemo(() => new Raycaster(), [])
  const pointer = useMemo(() => new Vector2(), [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      )

      raycaster.setFromCamera(pointer, camera)

      const hit = raycaster
        .intersectObjects(scene.children, true)
        .find(i => (i.object as any).isMesh)?.object as Mesh | undefined

      // restore previous
      if (hovered.current && hovered.current !== hit && originalScale.current) {
        hovered.current.scale.copy(originalScale.current)
        originalScale.current = null
      }

      if (!hit) {
        hovered.current = null
        document.body.style.cursor = "auto"
        return
      }

      document.body.style.cursor = "pointer"

      if (hovered.current !== hit) {
        originalScale.current = hit.scale.clone()
        hovered.current = hit
        hit.scale.setScalar(1.1)
      }
    }

    const onDown = () => {
      if (!hovered.current) return
      selected.current = hovered.current
      console.log("selected:", selected.current.name)
    }

    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerdown", onDown)

    return () => {
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerdown", onDown)
    }
  }, [camera, scene, raycaster, canvas])

  useEffect(() => {
    const mesh = selected.current
    if (!mesh) return

    const apply = (mat: any) => {
      if (texMap.Diffuse) mat.map = texMap.Diffuse
      if (texMap.NorGL) mat.normalMap = texMap.NorGL
      if (texMap.Rough) mat.roughnessMap = texMap.Rough
      if (texMap.Arm) mat.metalnessMap = texMap.Arm
      if (texMap.AO) mat.aoMap = texMap.AO
      // if (texMap.Displacement) {
      //   mat.displacementMap = texMap.Displacement
      //   mat.displacementScale = 0.1
      // }
      mat.needsUpdate = true
    }

    Array.isArray(mesh.material)
      ? mesh.material.forEach(apply)
      : apply(mesh.material)
  }, [texMap])

  // debug sphere — does NOT steal raycasts
  return (
    <mesh position={[3, 0, 0]} raycast={() => null}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        map={texMap.Diffuse}
        normalMap={texMap.NorGL}
        normalScale={2}
        roughnessMap={texMap.Rough}
        metalnessMap={texMap.Arm}
        // displacementMap={texMap.Displacement}
        // displacementScale={0.1}
      />
    </mesh>
  ) 
}

function useManager(id: string, includes: null | any = null) 
{

   // add to cache with a unique key for testing purposes
   // 

  const manager = useMemo(() => {

    const manager = new LoadingManager()

    // Start
    manager.onStart = () => 
    {

      useLoadingStore.setState((state) => ({ [id]: { ...state[id], manager: manager, active: true }}))
    }

    // Set up progress callback
    manager.onProgress = (_url: string, loaded: number, total: number) => 
    {
      const progress = (loaded / total) * 100
      useLoadingStore.setState((state) => ({ [id]: { ...state[id], progress, }}))
    }

    manager.onLoad = () => 
    {

        useLoadingStore.setState((state) => ({ [id]: { ...state[id], active: false, }}))
    }

    manager.onError = () => 
    {
      
      useLoadingStore.setState((state) => ({ [id]: { ...state[id], active: false, errors: [state.errors]}}))
    }

  // Extension to remap url ressources 
  if (includes) {
        manager.setURLModifier((resourceUrl) => {
          const filename = resourceUrl.split('/').pop()
          for (const [key, value] of Object.entries(includes)) {
            if (key.endsWith(filename!)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              console.log(`Remapping ${resourceUrl} -> ${(value as any).url}`)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (value as any).url
            }
          }
          return resourceUrl
        })
      }


    return manager
  }, [id])

  return manager 
}