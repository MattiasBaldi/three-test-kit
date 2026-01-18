# three-test-kit

A 3D testing playground built with React, Three.js, and Fiber. Load models, environments, and textures with live preview and interactive selection.

## What it does

- Load glTF models with automatic resource remapping
- Apply HDRI environments to your scene
- Apply PBR textures (diffuse, normal, roughness, metalness, AO) to selected meshes
- Orbit controls for navigation
- Real-time loading progress tracking
- Click to select and apply textures to individual objects

## Getting started

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

## What you need

The toolkit expects asset data in a specific format with file URLs for models, environments, and textures. Check the Ui component to see how assets are structured.

![demo](demo.gif)