# logger.js

Logger minimaliste avec horodatage ISO et niveaux de log.

## Pourquoi

`console.log` brut ne donne aucun contexte temporel.
Sur un serveur H24, impossible de savoir quand un événement s'est produit.
Ce logger préfixe chaque message avec la date/heure précise et un niveau.

## Niveaux

- `logger.info(msg)`  — événement normal (fetch réussi, client connecté...)
- `logger.warn(msg)`  — situation anormale mais non bloquante (cache expiré, retry...)
- `logger.error(msg)` — erreur à investiguer (API down, crash...)

## Exemple de sortie