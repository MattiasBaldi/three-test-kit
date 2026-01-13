import { Html, Center, useEnvironment } from '@react-three/drei'
import { Suspense, useState, useMemo, useEffect } from 'react'
import { LoadingManager } from 'three'
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

    const [env, setEnv] = useState<AssetData | null>(null)
    const [texture, setTexture] = useState<AssetData | null>(null)
    const [model, setModel] = useState<AssetData | null>(null)
    // set managers

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
            <Tex />
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

function Tex() {
  return null

  // *
  // Custom logic 
  // *

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