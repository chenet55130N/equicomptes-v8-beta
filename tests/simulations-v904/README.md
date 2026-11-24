# Simulations ÉquiComptes

Avec Node.js 22 ou supérieur, depuis la racine du dépôt, exécuter `node tests/simulations-v904/run.mjs`. Les 8 200 cas comparatifs et les 19 cas de reprise utilisent des foyers fictifs. Le processus signale un échec si un résultat diffère de l’attendu. `--json chemin.json` écrit le détail des résultats.

Pour comparer le même ensemble de 8 200 cas avec une autre révision, passer `--comparaison` et définir `EQUICOMPTES_SOURCE` avec le chemin de sa racine. Le numéro attendu et les ressources PWA proviennent de la révision testée.

Le pilote télécharge le module de test LinkeDOM à une révision fixe et vérifie son SHA-256. Hors ligne, définir `EQUICOMPTES_DOM` avec le chemin de cette copie de `worker.js`. La campagne utilise UTC et des graines déterministes. Le service Firestore en mémoire, le stockage et les comptes utilisés dans cette campagne sont isolés de la production.
