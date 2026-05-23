# server.js

Point d'entrée du serveur Aether Relay.

## Ce qu'il fait

- Sert les fichiers statiques du dossier `public/`
- Expose deux endpoints :
  - `GET /api/launches` — retourne les launches en JSON (REST classique)
  - `GET /sse` — ouvre une connexion Server-Sent Events vers le dashboard
- Poll les launches toutes les 30 minutes et broadcast à tous les clients connectés

## Flux de données