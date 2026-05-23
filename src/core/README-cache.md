# cache.js

Cache mémoire simple avec TTL (Time To Live).

## Pourquoi

L'API The Space Devs est limitée à 15 requêtes/heure sans clé.
Sans cache, chaque visiteur du dashboard déclencherait un fetch → quota épuisé en secondes.
Avec ce cache, on fetch une fois, on stocke le résultat en mémoire, et on le réutilise
pendant X minutes sans retoucher l'API.

## Comment ça marche

- `set(key, value, ttlMs)` — stocke une valeur avec une durée de vie en millisecondes
- `get(key)` — retourne la valeur si elle existe et n'a pas expiré, sinon `null`
- `clear(key)` — supprime une entrée manuellement

## Exemple

```js
const cache = require('./cache');

cache.set('launches', data, 30 * 60 * 1000); // stocke 30 minutes
const data = cache.get('launches');           // récupère si encore valide
```

## Limite

Cache purement en mémoire : si le serveur redémarre, le cache est vidé.
Pour ce projet c'est suffisant — le prochain fetch se fera au redémarrage.