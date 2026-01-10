import React from 'react'
import api from './api'
import { useQueries, useQuery } from '@tanstack/react-query'


export function useModel() {
    // return useQuery({
    //     queryKey: ["init"], 
    //     queryFn: () => api.getFiles(100)
    // })
}


export function useAssets() {
    return useQuery({
        queryKey: ["assets"], 
          queryFn: () => api.getAssets()  // Already returns parsed JSON
    })
}
