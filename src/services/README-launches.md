# launches.js

Service de récupération des prochains lancements spatiaux via The Space Devs API.

## Ce qu'il fait

1. Vérifie si les données sont en cache (valides 30 min)
2. Si oui → retourne le cache immédiatement, sans toucher l'API
3. Si non → fetch l'API, normalise les données, met en cache, retourne

## Données retournées par lancement

| Champ               | Exemple                          |
|---------------------|----------------------------------|
| `name`              | Falcon 9 Block 5 \| Starlink     |
| `status`            | `Go`, `TBD`, `Hold`              |
| `net`               | `2026-05-25T14:30:00Z`           |
| `agency`            | SpaceX                           |
| `rocket`            | Falcon 9 Block 5                 |
| `pad`               | SLC-40, Cape Canaveral           |
| `missionName`       | Starlink Group 6-45              |
| `missionOrbit`      | Low Earth Orbit                  |
| `imageUrl`          | https://...                      |

## Limites API

Sans clé API : **15 requêtes/heure** (mode demo).
Le cache 30 min garantit **2 requêtes/heure max** — bien en dessous du quota.

## Obtenir une clé API (optionnel)

Inscription sur https://thespacedevs.com/supportus
Clé gratuite pour usage non-commercial → 300 req/heure.
Ajouter dans `.env` : `SPACE_DEVS_API_KEY=ta_clé`