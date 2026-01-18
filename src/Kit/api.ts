/**
 * Polyhaven API Client
 * Documentation: https://api.polyhaven.com/api-docs
 * Base URL: https://api.polyhaven.com
 *
 * IMPORTANT: All requests require a unique User-Agent header
 */

const BASE_URL = 'https://api.polyhaven.com';

// ============= Types =============

export const ASSET_TYPES = {
  HDRIS: 'hdris',
  MODELS: 'models',
  TEXTURES: 'textures',
} as const;

export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];

// Asset type numbers: 0 = hdri, 1 = texture, 2 = model
export type AssetTypeNum = 0 | 1 | 2;

export interface AssetData {
  type: AssetTypeNum;
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files?: Record<string, any>;
}

export interface AssetMetadata {
  id: string;
  name: string;
  categories: string[];
  tags: string[];
  authors: { [authorId: string]: string };
  [key: string]: unknown; // Additional metadata fields
}

export interface AssetsResponse {
  [assetId: string]: AssetMetadata;
}

export interface HDRIInfo {
  id: string;
  name: string;
  categories: string[];
  tags: string[];
  authors: { [authorId: string]: string };
  evs_cap: number;
  whitebalance: number;
  // Additional HDRI-specific fields
}

export interface TextureInfo {
  id: string;
  name: string;
  categories: string[];
  tags: string[];
  authors: { [authorId: string]: string };
  dimensions: [number, number];
  // Additional texture-specific fields
}

export interface ModelInfo {
  id: string;
  name: string;
  categories: string[];
  tags: string[];
  authors: { [authorId: string]: string };
  dimensions: [number, number, number];
  // Additional model-specific fields
}

export type AssetInfo = HDRIInfo | TextureInfo | ModelInfo;

export interface FileInfo {
  url: string;
  size: number;
  md5: string;
}

export interface HDRIFiles {
  hdri: {
    [resolution: string]: {
      [format: string]: FileInfo;
    };
  };
}

export interface TextureFiles {
  [mapType: string]: {
    [resolution: string]: {
      [format: string]: FileInfo;
    };
  };
}

export interface ModelFiles {
  [format: string]: {
    [resolution: string]: FileInfo;
  };
}

export type AssetFiles = HDRIFiles | TextureFiles | ModelFiles;

export interface AuthorInfo {
  name: string;
  link?: string;
  email?: string;
  donate?: string;
}

export interface CategoriesResponse {
  [categoryName: string]: number; // category name to asset count
}

// ============= API Client =============

export class PolyhavenAPI {
  private baseUrl: string;
  private userAgent: string;

  constructor(userAgent: string = 'three-test-kit') {
    this.baseUrl = BASE_URL;
    this.userAgent = userAgent;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * GET /types
   * Returns a list of asset types available
   *
   * @returns Array of asset types (e.g., ["hdris", "textures", "models"])
   * @example
   * const types = await api.getTypes();
   * console.log(types); // ["hdris", "textures", "models"]
   */
  async getTypes(): Promise<string[]> {
    return this.fetch<string[]>('/types');
  }

  /**
   * GET /assets
   * Returns a list of assets with their metadata
   *
   * @param type - Filter by asset type (hdris/textures/models/all)
   * @param categories - Comma-separated list of categories to filter by
   * @returns Object with asset IDs as keys and metadata as values
   * @example
   * const hdris = await api.getAssets('hdris');
   * const outdoorTextures = await api.getAssets('textures', 'outdoor');
   */
  async getAssets(type?: AssetType, categories?: string): Promise<AssetsResponse> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (categories) params.append('categories', categories);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetch<AssetsResponse>(`/assets${query}`);
  }

  /**
   * GET /info/{id}
   * Returns detailed information about a specific asset
   *
   * @param id - Unique asset ID/slug
   * @returns Asset information object
   * @example
   * const info = await api.getInfo('abandoned_greenhouse');
   * console.log(info.name, info.categories, info.authors);
   */
  async getInfo(id: string): Promise<AssetInfo> {
    return this.fetch<AssetInfo>(`/info/${id}`);
  }

  /**
   * GET /files/{id}
   * Returns file list for a specific asset with download URLs and metadata
   *
   * @param id - Unique asset ID/slug
   * @returns Object with available files, resolutions, and formats
   * @example
   * const files = await api.getFiles('abandoned_greenhouse');
   * // Access HDRI files: files.hdri['4k']['exr'].url
   * // Access texture files: files['diffuse']['1k']['jpg'].url
   */
  async getFiles(id: string): Promise<AssetFiles> {
    return this.fetch<AssetFiles>(`/files/${id}`);

  }

  /**
   * GET /author/{id}
   * Returns information about a specific author
   *
   * @param id - Unique author ID
   * @returns Author information (name, link, email, donation info)
   * @example
   * const author = await api.getAuthor('greg_zaal');
   * console.log(author.name, author.link);
   */
  async getAuthor(id: string): Promise<AuthorInfo> {
    return this.fetch<AuthorInfo>(`/author/${id}`);
  }

  /**
   * GET /categories/{type}
   * Returns available categories for a given asset type with asset counts
   *
   * @param type - Asset type (hdris/textures/models)
   * @param filterIn - Comma-separated list of categories to filter by
   * @returns Object mapping category names to asset counts
   * @example
   * const categories = await api.getCategories('hdris');
   * console.log(categories); // { "outdoor": 120, "indoor": 80, ... }
   */
  async getCategories(type: AssetType, filterIn?: string): Promise<CategoriesResponse> {
    const params = new URLSearchParams();
    if (filterIn) params.append('in', filterIn);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetch<CategoriesResponse>(`/categories/${type}${query}`);
  }

  /**
   * Load asset and return URL + includes for models
   * @param id - Asset ID
   * @param typeNum - Asset type number (0: hdri, 1: texture, 2: model)
   */
  async loadAsset(id: string, typeNum: number) {
    let url: string | undefined;
    let type: string | undefined;
    let includes: unknown;
    const r = await this.getFiles(id);

    console.log({r})

    switch (typeNum) {
      case 0:
        // load hdri
        type = "hdri"
        if ('hdri' in r) {
          url = (r.hdri as Record<string, Record<string, FileInfo>>)["1k"]?.["hdr"]?.url;
        }
        break;

      case 1:
        // load textures
        type = "texture"
        if ('Diffuse' in r) {
          url = (r.Diffuse as Record<string, Record<string, FileInfo>>)["1k"]?.["jpg"]?.url;
        }
        break;

      case 2:
        // load model
        type = "model"
        if ('gltf' in r) {
          const gltfData = (r.gltf as Record<string, Record<string, unknown>>)["1k"];
          url = (gltfData?.gltf as FileInfo)?.url;
          includes = (gltfData?.gltf as Record<string, unknown>)?.include;
        }
        break;

      default:
        url = undefined;
    }

    return {url, type, includes};
  }
}

// ============= Usage Examples =============

/**
 * Example 1: Get all HDRI assets
 */
export async function example1_GetHDRIs() {
  const api = new PolyhavenAPI('my-app-name');
  const hdris = await api.getAssets('hdris');

  for (const [id, metadata] of Object.entries(hdris)) {
    console.log(`${id}: ${metadata.name}`);
  }
}

/**
 * Example 2: Get outdoor textures
 */
export async function example2_GetOutdoorTextures() {
  const api = new PolyhavenAPI('my-app-name');
  const textures = await api.getAssets('textures', 'outdoor');

  return textures;
}

/**
 * Example 3: Download a specific HDRI
 */
export async function example3_DownloadHDRI(assetId: string) {
  const api = new PolyhavenAPI('my-app-name');

  // Get asset info
  const info = await api.getInfo(assetId);
  console.log(`Downloading: ${info.name}`);

  // Get available files
  const files = await api.getFiles(assetId);

  // Access the 4K EXR file (if it's an HDRI)
  if ('hdri' in files) {
    const hdriData = files.hdri as Record<string, Record<string, FileInfo>>
    const file4k = hdriData['4k']?.['exr'];
    if (file4k) {
      console.log(`Download URL: ${file4k.url}`);
      console.log(`File size: ${file4k.size} bytes`);
      console.log(`MD5: ${file4k.md5}`);

      // Download the file
      const response = await fetch(file4k.url);
      const blob = await response.blob();
      return blob;
    }
  }
}

/**
 * Example 4: Get all categories and their counts
 */
export async function example4_GetCategories() {
  const api = new PolyhavenAPI('my-app-name');

  const hdriCategories = await api.getCategories('hdris');
  console.log('HDRI Categories:', hdriCategories);

  const textureCategories = await api.getCategories('textures');
  console.log('Texture Categories:', textureCategories);

  const modelCategories = await api.getCategories('models');
  console.log('Model Categories:', modelCategories);
}

/**
 * Example 5: Search for specific assets by tag
 */
export async function example5_SearchByTag(searchTag: string) {
  const api = new PolyhavenAPI('my-app-name');
  const allAssets = await api.getAssets();

  const matches = Object.entries(allAssets)
    .filter(([, metadata]) => metadata.tags.includes(searchTag))
    .map(([id, metadata]) => ({ id, name: metadata.name, categories: metadata.categories, tags: metadata.tags, authors: metadata.authors }));

  return matches;
}



// const resolution = {
//     1k, 
//     2k, 
//     4k, 
//     8k, 
// }


// if arm -> use Arm for ao, roughness, normal
// else use each and every other available

// const texTypes = {
//     AO: 
//     Diffuse: 
//     Displace: 
//     Rough: 
//     Arm: 
//     Normal: 
// }




// ============= Export default instance =============

export default new PolyhavenAPI('three-test-kit');

/**
 * Poly Haven API – Endpoints
 *
 * @see https://redocly.github.io/redoc/?url=https://api.polyhaven.com/api-docs/swagger.json&nocors
 * Base URL: https://api.polyhaven.com
 */

/**
 * 1. GET /types
 * Returns available asset types.
 * Values: hdris, textures, models
 */

/**
 * 2. GET /assets
 * Returns a list of assets with basic metadata.
 *
 * Query params:
 * - type: hdris | textures | models | all
 * - categories: comma-separated list (must match all)
 */

/**
 * 3. GET /info/{id}
 * Returns full metadata for a single asset.
 *
 * Path param:
 * - id: asset slug
 */

/**
 * 4. GET /files/{id}
 * Returns all downloadable files for an asset,
 * grouped by resolution and file type.
 *
 * Path param:
 * - id: asset slug
 */

/**
 * 5. GET /author/{id}
 * Returns information about an asset author.
 *
 * Path param:
 * - id: author ID
 */

/**
 * 6. GET /categories/{type}
 * Returns categories and asset counts for a given type.
 *
 * Path param:
 * - type: hdris | textures | models
 *
 * Query param:
 * - in: comma-separated category filter
 */
