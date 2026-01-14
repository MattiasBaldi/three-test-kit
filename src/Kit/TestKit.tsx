import { Html, Center, useEnvironment, useCursor } from '@react-three/drei'
import { Suspense, useState, useMemo, useEffect } from 'react'
import { LoadingManager, Mesh, Raycaster, Vector2 } from 'three'
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
         {/* {texture && */}
          <Suspense>
            <Tex data={texture}/>
          </Suspense>
         {/* } */}

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

function Tex({data}: {data: AssetData}) {

  const { camera, scene } = useThree()
  const [pointer, setPointer] = useState<Vector2>()
  const [selected, setSelected] = useState<Mesh | null>(null)
  const [isHovering, setIsHovering] = useState<boolean>(false)

  //   /** Custom logic
  //    * Pick mesh' in the scene and allow them to be clicked / selected
  //    * When selected it should be possible to add textures to that element
  //    * When selected it gets outlined (the mesh)
  //    * New mesh' added to the scene should have this affect too
  //    */ 

  //   // Set up a raytracer
  //   // Set eventListener that changes to cursor pointer whenever a mesh is selected
  useEffect(() => {
    const raycaster = new Raycaster()

    function onPointerMove(e: PointerEvent) {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      const newPointer = new Vector2(x, y)
      setPointer(newPointer)

      raycaster.setFromCamera(newPointer, camera)

      // Optional: detect intersections immediately
      const intersects = raycaster.intersectObjects(scene.children, true)
      
      
      // Hit
      if (intersects.length > 0) 
      {
        if (intersects[0].object && intersects[0].object?.isMesh)
          {
            setSelected(intersects[0]?.object)
            setIsHovering(true)
            console.log(intersects[0].object)
          }
      }
      // No hit
      else 
      {
        setIsHovering(false)
      }
    }


    function onPointerDown(e: PointerEvent) {
      if (!isHovering) return 
      // set it as selected

      // setSelected()
    }

    // listener
    window.addEventListener('pointermove', onPointerMove)
    return () => window.removeEventListener('pointermove', onPointerMove)
    
  }, [camera, scene])

  // hover effect
  useEffect(() => {
    if (isHovering) document.body.style.cursor = "pointer"
    if (!isHovering) document.body.style.cursor = "auto"
  }, [isHovering])

  // Set edges to indicate its selected
// export const Edges: ForwardRefComponent<EdgesProps, EdgesRef> = /* @__PURE__ */ React.forwardRef<EdgesRef, EdgesProps>(
//   ({ threshold = 15, geometry: explicitGeometry, ...props }: EdgesProps, fref) => {
//     const ref = React.useRef<LineSegments2>(null!)
//     React.useImperativeHandle(fref, () => ref.current, [])

//     const tmpPoints = React.useMemo(() => [0, 0, 0, 1, 0, 0], [])
//     const memoizedGeometry = React.useRef<THREE.BufferGeometry>(null)
//     const memoizedThreshold = React.useRef<number>(null)

//     React.useLayoutEffect(() => {
//       const parent = ref.current.parent as THREE.Mesh
//       const geometry = explicitGeometry ?? parent?.geometry
//       if (!geometry) return

//       const cached = memoizedGeometry.current === geometry && memoizedThreshold.current === threshold
//       if (cached) return
//       memoizedGeometry.current = geometry
//       memoizedThreshold.current = threshold

//       const points = (new THREE.EdgesGeometry(geometry, threshold).attributes.position as THREE.BufferAttribute)
//         .array as Float32Array
//       ref.current.geometry.setPositions(points)
//       ref.current.geometry.attributes.instanceStart.needsUpdate = true
//       ref.current.geometry.attributes.instanceEnd.needsUpdate = true
//       ref.current.computeLineDistances()
//     })

//     return <Line segments points={tmpPoints} ref={ref as any} raycast={() => null} {...props} />
//   }

   return null

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