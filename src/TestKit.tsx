import { Html, OrbitControls, Environment, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAllAssets, useAssets } from './useQueries'
import api, {ASSET_TYPES, type AssetType} from './api'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'


const queryClient = new QueryClient()


// 3D Scene Component - renders inside Canvas
export default function TestKit() 
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
                <Ui props={{env, setEnv, texture, setTexture, model, setModel}} />
             </QueryClientProvider>
            </Html>
        </>
    )
}

function Model({ url }: { url: string }) {
  const {scene} = useGLTF(url, true, true, (loader) => {
    console.log({loader, url})

    // loader.resourcePath = "https://dl.polyhaven.org/file/ph-assets/Models/gltf"
    // This needs to be extended to account for the fact that the ressources does not come as .glb and base roots differ from textures to bin/gltf

  })
  return <primitive object={scene} />
}

function Env({ HDRI }: { HDRI: string }) {
    return <Environment files={HDRI} />
}

// UI Component (thumbnails) - renders outside Canvas
export function Ui({props}) {
    const [type, setType] = useState<AssetType>('models')
    const [searchQuery, setSearchQuery] = useState<string | null>(null)

    // init fetch all
    const assets = useAllAssets()

    return createPortal(

      <div className="fixed z-100 top-0 left-0 p-4 flex flex-col bg-gray-200"
      style={{
        overflow: 'scroll',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE 10+
      }} >

    <div className='flex'>

    {/* Tabs */}
    {Object.values(ASSET_TYPES).map((asset) => (<Tab key={asset} text={asset} active={type === asset} onClick={() => setType(asset)} />))}

    </div>

        {/* Search */}
        <Search searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <Marquee searchQuery={searchQuery} assets={assets[type]} props={props} />
              
        </div>,
        document.body
    )
}

interface TabProps {
  onClick: () => void;
  text: string;
  active: boolean; 
}

function Tab({ onClick, text, active }: TabProps) {
  return (
  <button
  onClick={onClick}
  className={`px-4 py-2 rounded-lg font-medium text-black
    ${active ? '' : 'opacity-50'}
    focus:outline-none focus:ring-0
    hover:outline-none hover:ring-0`}
>
  {text}
</button>

  );
}

/// Marquee
interface MarqueeProps {
  assets: {
    data: any;
    isLoading: boolean;
  };
  props?: any; // if you want to pass setEnv/setTexture/etc
  searchQuery: string; 

}

function Marquee({ assets, props, searchQuery }: MarqueeProps) {

  const filtered = useMemo(() => {
    if (assets.isLoading || !assets.data) return null; 
    
    let entries = Object.entries(assets.data);

    // searching 
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(([id, v]) => v.name.toLowerCase().includes(q));
      return entries
    }

    // pagination
    else {
    return entries.slice(0, 100);
    }
  }, [assets, searchQuery]);


  if (!filtered) return null;

  return (
    <div className="flex h-40 gap-4 overflow-x-auto">
      {filtered.map(([id, v]) => (
        <img
          key={id}
          className="h-full object-contain hover:cursor-pointer hover:border p-8"
          src={v.thumbnail_url}
          alt={v.name}
          loading="lazy"
          onClick={async () => {
            if (!props) return;
            const d = await loadAsset(id, v.type);
            switch (d.type) {
              case 'hdri':
                props.setEnv(d.url);
                break;
              case 'texture':
                props.setTexture((prev) => [...prev, d.url]);
                break;
              case 'model':
                props.setModel(d.url);
                break;
            }
          }}
        />
      ))}
    </div>
  );
}


// Search
interface SearchProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

function Search({searchQuery, setSearchQuery}: SearchProps) {

  return (<form className='w-full'>
<input
  onChange={(e) => setSearchQuery(e.target.value)}
  className="w-[100vw] p-2 outline-0 border-1 rounded-xl"
  value={searchQuery ?? ''}
  type="text"
  placeholder="search.."
/>

  </form>)


}


// Search
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


