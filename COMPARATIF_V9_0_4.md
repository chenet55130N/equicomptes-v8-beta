# ÉquiComptes V9.0.4 · Comparatif avec la V9.0.3 publiée

La page publique, le module de synchronisation et le service worker récupérés sur GitHub Pages correspondaient octet pour octet à la révision `a110fc0f7ea100ef4f6440f77fb99998695f5a66`. La V9.0.4 est une proposition préparée sur une branche séparée.

| Campagne avec les mêmes foyers fictifs | V9.0.3 publiée | V9.0.4 proposée |
|---|---:|---:|
| Scénarios comparables | 8 200 | 8 200 |
| Réussis | 8 150 | 8 200 |
| En écart | 50 | 0 |
| Catégories présentant au moins un écart | 16 | 0 |

Les 4 608 scénarios de calcul courant et les 120 parcours ordinaires de gestion des charges datées réussissent sur les deux versions. Les 19 contrôles supplémentaires de reprise de données portent sur le correctif.

| N° | Anomalie | Échecs en V9.0.3 | Échecs en V9.0.4 | Comportement vérifié |
|---:|---|---:|---:|---|
| 1 | Reprise d’un abonnement | 4 | 0 | Après une suppression programmée, le nouveau payeur est enregistré sous l’identifiant de la charge. Une ancienne reprise ambiguë demande une confirmation. |
| 2 | Mois futur protégé | 4 | 0 | Un achat limité à décembre reste possible si février est déjà validé. Si l’édition change un mouvement de février, elle est bloquée. |
| 3 | Fiche d’une charge archivée | 4 | 0 | Une assurance à 100 € en novembre affiche toujours 100 € dans sa fiche de novembre, même après passage à 125 € ou suppression. |
| 4 | Clôture prématurée | 2 | 0 | Les mouvements restant à confirmer sont indiqués avant clôture. Une ancienne archive bloquée permet de confirmer un mouvement déjà prévu. |
| 5 | Copie des virements | 2 | 0 | En mode sans joint, un seul virement d’Alex à Camille est copié. Une fois effectué, la copie indique qu’il ne reste rien à verser. |
| 6 | Préparation du changement de mode | 1 | 0 | Le menu permet de choisir les payeurs du mois suivant avant de quitter le mode joint. Annuler annule aussi la préparation. |
| 7 | Écrasement entre appareils | 14 | 0 | Une modification concurrente conserve les deux propositions pour arbitrage, y compris lorsqu’une personne supprime la ligne. |
| 8 | Charge réactivée sans payeur | 2 | 0 | Une exception mensuelle déclenche la demande de payeur. La compensation attend que le compte soit identifié. |
| 9 | Deux salaires nuls | 2 | 0 | Sur une facture commune de 100 €, le prorata attend une base de calcul. En 50/50, le résumé et le détail indiquent 50 €. |
| 10 | Modification d’un mois clôturé | 3 | 0 | L’ajout de prime, la restauration des salaires habituels et l’annulation d’une compensation confirmée sont protégés. |
| 11 | Mois sauté après une absence | 1 | 0 | Une réouverture en janvier traite novembre puis décembre. Le premier mois ayant un mouvement en attente reste accessible. |
| 12 | Sauvegarde relue partiellement | 6 | 0 | La 301e charge et les autres listes contrôlées sont conservées à la relecture. Le stockage plein est signalé lors de la saisie d’une charge. |
| 13 | Copie avant bascule bancaire | 2 | 0 | Dans chaque sens, une copie restaurable précède la bascule, indépendamment de la fréquence automatique. L’échec de la copie suspend la bascule. |
| 14 | Explication du solde du joint | 1 | 0 | Pour 800 € de loyer sur le joint et 100 € sur un compte personnel, le texte indique 800 € à conserver sur le joint. |
| 15 | Date réelle | 1 | 0 | La date civile du jour est affichée même en l’absence de changement de mois. |
| 16 | Version dans les signalements | 1 | 0 | Le menu, les informations techniques et l’objet du message identifient la V9.0.4. |

### Essayer le correctif

Télécharger et décompresser cette branche, puis ouvrir **ESSAI_LOCAL.html** dans Chrome ou Edge. Le foyer fictif est déjà renseigné. Camille a payé 700 € et Alex 200 €. En 50/50, l’écran indique **250 € d’Alex à Camille**. Après **Marquer effectué**, il reste 0 €. Cette édition conserve ses essais sur l’appareil. Le fichier **index.html** et **sync-v8.js** à la racine constituent la version connectée destinée à une éventuelle publication.

### Portée des vérifications

Les simulations utilisent des montants en centimes, des scénarios reproductibles et des données fictives. Les 14 échecs de concurrence du comparatif proviennent d’un service Firestore simulé. Trois opérations ont également été rejouées avec deux clients indépendants contre l’émulateur officiel Firestore et le SDK 13.2.0. La V9.0.3 laisse passer la dernière écriture lors d’une modification, d’une suppression ou d’une création concurrente. La V9.0.4 demande un arbitrage dans les trois cas. La synchronisation sur deux téléphones physiques avec le service Firebase de production reste à valider.

Les anciennes données déjà perdues par une écriture concurrente ou par la troncature d’une sauvegarde nécessitent une copie antérieure pour être récupérées. Une attribution de payeur ambiguë est signalée à la prochaine utilisation d’un mois ouvert concerné.

### Rejouer les contrôles

Depuis la racine du dépôt, avec Node.js 22 ou supérieur, exécuter `node tests/simulations-v904/run.mjs` pour les 8 219 scénarios et `node tests/v9-prepublication.cjs` pour la suite du projet. La commande `node tests/simulations-v904/navigateur.cjs` vérifie la confirmation du paiement et la relecture du foyer fictif dans Chrome.
