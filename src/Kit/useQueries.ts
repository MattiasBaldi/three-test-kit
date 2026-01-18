import { useMemo } from 'react';
import api, { ASSET_TYPES, type AssetType } from './api';
import { useQuery } from '@tanstack/react-query';

// Example hook for fetching a model (currently commented out)
// export function useModel() {
//   return useQuery({
//     queryKey: ['init'],
//     queryFn: () => api.getFiles(100),
//   });
// }

export function useAssets({
  type,
  categories,
}: { type?: AssetType; categories?: string } = {}) {
  return useQuery({
    queryKey: ['assets', type ?? null, categories ?? null],
    queryFn: () => api.getAssets(type, categories),
  });
}

export function useAllAssets() {
  // fetch each type
  const { data: models, isLoading: modelsIsLoading } = useAssets({ type: 'models' });
  const { data: hdris, isLoading: hdrisIsLoading } = useAssets({ type: 'hdris' });
  const { data: textures, isLoading: texturesIsLoading } = useAssets({ type: 'textures' });

  // memoize combined object
  return useMemo(() => ({
    models: {
      type: ASSET_TYPES.MODELS, 
      data: models,
      isLoading: modelsIsLoading,
    },
    hdris: {
      type: ASSET_TYPES.HDRIS, 
      data: hdris,
      isLoading: hdrisIsLoading,
    },
    textures: {
      type: ASSET_TYPES.TEXTURES, 
      data: textures,
      isLoading: texturesIsLoading,
    },
  }), [models, modelsIsLoading, hdris, hdrisIsLoading, textures, texturesIsLoading]);
}
