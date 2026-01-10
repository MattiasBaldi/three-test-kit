import { Html, OrbitControls, Environment, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAssets } from './useQueries'
import api from './api'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'


const queryClient = new QueryClient()


// 3D Scene Component - renders inside Canvas
export default function TestKit({}) 
{
    const [env, setEnv] = useState(null)
    const [texture, setTexture] = useState([])
    const [model, setModel] = useState(null)



    return (
        <>
        <OrbitControls />
           
      {/* Models */}
        {model &&
          <Suspense>
            <Model url={model}/>
          </Suspense>
        }

      {/* Environment */}
        {env && 
          <Suspense>
            <Env HDRI={env}/>
          </Suspense>
          }


         {/* Textures */}



          {/* Ui */}
            <Html>
              <QueryClientProvider client={queryClient}>
                <Kit props={{env, setEnv, texture, setTexture, model, setModel}}></Kit>
             </QueryClientProvider>
            </Html>
        </>
    )
}

// UI Component (thumbnails) - renders outside Canvas
export function Kit({props}) {

    const {data, isLoading} = useAssets()
    if (isLoading) return null

    // As [key, value] pairs
    const entries = Object.entries(data);
    const filtered = entries.slice(0, 100)

    return createPortal(
        <div className="fixed flex z-100 top-0 left-0 p-4 gap-20 overflow-auto" style={{height: '200px', width: '100vw'}} >
                {filtered.map(([id, v]) =>
                    <img
                        onClick={ async () => {
                            console.log(id, v.type)
                            await loadAsset(id, v.type).then((d) => 
                          {  
                            console.log(d)
                             switch (d.type) {
                                case "hdri":
                                // load hdri
                                props.setEnv(d.url)
                                break;

                                case "texture":
                                // load textures
                                props.setTexture((prev) => [...prev, d.url])
                                break;

                                case "model":
                                // load model
                                props.setModel(d.url)
                
                                break;

                                default:
                                return
                            }

                                  console.log(d)

                            }

                            )
                            .catch((e) => {throw e})

            
                        }}
                        key={id}
                        className='h-full object-contain hover:cursor-pointer  hover:border p-8'
                        src={v.thumbnail_url}
                        alt={v.name}
                        loading='lazy'
                    />
                )}
        </div>,
        document.body
    )
}

function Model({ url }: { url: string }) {
    const { scene } = useGLTF(url)
    console.log(scene)
    return <primitive object={scene} />
}

function Env({ HDRI }: { HDRI: string }) {
    return <Environment files={HDRI} />
}


const loadAsset = async (id, typeNum) => {
  let url, type;
  const r = await api.getFiles(id);

  console.log({id, typeNum, r})

  switch (typeNum) {
    case 0:
      // load hdri
      type = "hdri"
      url = r?.hdri?.["1k"]?.hdr?.url;
      break;

    case 1:
      // load textures
      type = "texture"
      url = r?.diffuse?.["1k"]?.jpg?.url;
      break;

    case 2:
      // load model
      type = "model"
      url = r?.gltf?.["1k"]?.gltf?.url;
      break;

    default:
      url = undefined;
  }

  return {url, type};
};


