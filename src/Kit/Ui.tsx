import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAllAssets } from './useQueries'
import api, { ASSET_TYPES, type AssetType, type AssetData } from './api'
import { Download } from 'lucide-react'
import { useLoadingStore } from './TestKit'

interface SettersProps {
  setEnv: (data: AssetData) => void
  setTexture: (data: AssetData) => void
  setModel: (data: AssetData) => void
}

interface UiProps {
  props: SettersProps
}

// UI Component (thumbnails) - renders outside Canvas
export function Ui({ props }: UiProps) {
    const [type, setType] = useState<AssetType>('hdris')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [height, setHeight] = useState<number>(200)
    const [isDragging, setIsDragging] = useState<boolean>(false)

    // init fetch all
    const assets = useAllAssets()

    useEffect(() => {
      if (!isDragging) return

      const handleMouseMove = (e: MouseEvent) => {
        const newHeight = e.clientY
        setHeight(Math.max(50, Math.min(newHeight, window.innerHeight - 50)))
      }

      const handleMouseUp = () => {
        setIsDragging(false)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }, [isDragging])

    return createPortal(
      <div
      className="fixed z-100 top-0 left-0 w-screen flex flex-col bg-gray-200 select-none"
      style={{ height: `${height}px` }}>

        <div className='p-4 flex-1 overflow-y-auto'>

          <div className='flex flex-row-reverse w-full justify-between mb-4'>
            <Search searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <div className='flex'>{Object.values(ASSET_TYPES).map((asset) => (<Tab key={asset} text={asset} active={type === asset} onClick={() => setType(asset)} />))}</div>
          </div>

          <Marquee searchQuery={searchQuery} assets={assets[type]} props={props} />
        </div>

        <div
          onMouseDown={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          className="h-1 bg-gray-400 hover:bg-gray-600 cursor-ns-resize transition-colors"
        />

    </div>

    ,document.body
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any>;
    isLoading: boolean;
  };
  props: SettersProps;
  searchQuery: string;
}

function Marquee({ assets, props, searchQuery }: MarqueeProps) {
  const filtered = useMemo(() => {
    if (assets.isLoading || !assets.data) return null;

    const entries = Object.entries(assets.data);

    // searching
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return entries.filter(([, v]) => v.name.toLowerCase().includes(q))
    }

    return entries
  }, [assets, searchQuery]);

  if (!filtered) return null;

  return (
    <div className="flex h-40 gap-4 overflow-x-auto">
      {filtered.map(([id, v]) => (
        <Asset key={id} id={id} v={v} props={props} />
      ))}
    </div>
  );
}

// Asset
interface AssetProps {
  id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v: any
  props: SettersProps
}

function Asset({ id, v, props }: AssetProps) {
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // new
  const setAsset = async () => {
      if (!props) return;
      const files = await api.getFiles(id);
      const data = { type: v.type, info: v, id: id, files: files } as AssetData

      // type: 0 = hdri, 1 = texture, 2 = model
      switch (data.type) {
        case 0:
          props.setEnv(data);
          break;
        case 1:
          props.setTexture(data);
          break;
        case 2:
          props.setModel(data);
          break;
        default:
          console.warn('Unknown asset type:', data.type);
      }
  }
  return (
    <div
      className={`shrink-0 flex items-center justify-center hover:cursor-pointer p-2 transition-colors rounded relative ${!isButtonHovered ? 'hover:bg-gray-500' : ''}`}
      style={{ width: '160px', height: '100%' }}
      onClick={() => setAsset()}
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
    >
      <img
        className="w-auto max-h-full object-contain"
        src={v.thumbnail_url}
        alt={v.name}
        loading="lazy"
      />


      {/* <LoadingBar />  */}
      <LoadingBar id={id}/>

      {/* Download link */}
      <a
        className='absolute bottom-1 right-1 bg-white rounded p-0 shadow hover:bg-gray-100 transition-colors'
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        onClick={(e) => { e.stopPropagation()}}
      >
        <Download size={16} className='text-gray-700' />
      </a>

      {/* Asset details on hover */}
      {isHovered &&
        <div className='fixed top-12 right-30 bg-gray-800 text-white rounded-lg shadow-xl p-4 max-w-sm z-50'>
          <img
            className="w-full h-32 object-contain rounded mb-3"
            src={v.thumbnail_url}
            alt={v.name}
            loading="lazy"
          />
          <div className='space-y-1 text-sm'>
            {Object.entries(v)
              .filter(([key, value]) =>
                typeof value !== 'object' &&
                key !== 'thumbnail_url' &&
                value !== null &&
                value !== undefined
              )
              .map(([key, value]) => (
                <div key={key} className='flex gap-2'>
                  <span className='text-gray-400 font-medium min-w-20'>{key}:</span>
                  <span className='text-white'>{String(value)}</span>
                </div>
              ))
            }
          </div>
        </div>
      }

    </div>
  )
}

// Search
interface SearchProps {
  searchQuery: string
  setSearchQuery: (value: string) => void
}

function Search({ searchQuery, setSearchQuery }: SearchProps) {
  return (
    <form className='w-full'>
      <input
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-2 outline-0 border rounded-xl"
        value={searchQuery}
        type="text"
        placeholder="search.."
      />
    </form>
  )
}

function LoadingBar({ id }: { id: string }) {
  const progress = useLoadingStore((state) => state[id]?.progress ?? 0)


  const color = progress === 0 ? "red" : progress === 100 ? "green" : "blue"

  return (
    <div className="absolute top-0 left-0 right-0 h-1 bg-gray-300">
      <div
        className="h-full transition-all duration-300"
        style={{ width: `${progress}%`, backgroundColor: color }}
      />
    </div>
  )
}

