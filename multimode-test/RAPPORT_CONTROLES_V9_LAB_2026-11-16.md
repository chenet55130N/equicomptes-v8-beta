# ÉquiComptes — V9.0 LAB : contrôle des règles historiques
Date : 16 novembre 2026

## Périmètre
- Version test : `multimode-test/index.html`. Pas de synchronisation Firebase, pas de publication de la V9 officielle.
- Code officiel `index.html` maintenu en V8.3, partage QR présent.
- Sauvegarde préalable : branche `sauvegarde-lab-avant-historique-v9-20261116`.

## Règles implémentées
1. Compte payeur de chaque charge configurable pour le mois en cours OU le mois suivant. Les dates d'effet sont stockées dans `lab.payerChanges`, séparément pour les modes joint et comptes personnels.
2. Partage des charges communes 50/50 ou au prorata daté via `lab.splitChanges`.
3. Modification refusée pour un mois antérieur, archivé ou comportant une confirmation de virement initial ou de compensation.
4. La modification du mois suivant reste possible si le mois actuel contient un virement confirmé.
5. Les mois clôturés sont figés sous `lab.frozen[YYYY-MM]` avec le résultat, les charges et les comptes payeurs du mois. Archive créée lors de la clôture.
6. Le passage simulé au mois suivant exige la régularisation des mouvements en attente, afin de ne pas rendre ceux-ci irréversiblement inaccessibles.
7. Les revenus complémentaires n'entrent pas dans la compensation entre comptes personnels, qui dépend seulement des charges.

## Cas financiers de référence
Hypothèses : revenus Camille 2 100 €, Alex 1 650 €. Charges communes : loyer 600 €, électricité 100 €, courses 200 €. Assurance et abonnement personnel désactivés pour isoler l'exemple.
- Sans joint, 50/50, Camille paie 700 € et Alex 200 € : Alex doit 250 € à Camille.
- Si, à compter de décembre, le loyer passe sur le compte d'Alex : Camille paie 100 €, Alex 800 € ; Camille doit 350 € à Alex (décembre à 50/50).
- Avec le même changement de payeur et une répartition au prorata (56 % / 44 %) : Camille doit 404 € à Alex.
- Novembre conserve le résultat original de 250 € d'Alex vers Camille, même si le compte du loyer ou le montant de la charge change ensuite.
- Un bonus de 150 € attribué à Camille ne change pas le virement de compensation des charges dans le mode sans joint.

## Contrôles effectués
- 1 400 scénarios aléatoires avec comparaison à une implémentation indépendante : 1 400 conformes.
- 15 contrôles de transitions de période, changement de payeur, partage, archivage et conservation d'un résultat : 15 conformes.
- 8 tests ciblés de la fonction d'enregistrement de charge : 8 conformes (mois actuel, futur, confirmé, ancien, montant).
- 12 contrôles des règles de datation, 12 conformes.
- 3 tests de changement de mois (mouvements non régularisés, régularisés, absence de migration), 3 conformes.
- 6 cas d'avances/remboursements : 6 conformes, y compris les arrondis au centime et la compensation croisée.
- 5 scripts inline de la page passés au contrôle syntaxique JavaScript.
- GitHub Pages : déploiement du dernier correctif vérifié par l'action de publication.

## Non couvert / prérequis avant publication V9.0
- Aucun test réel inter-appareils Firebase/Firestore, ni migration des données existantes d'un foyer connecté. Le LAB n'exécute pas le module Firebase.
- Aucune validation de l'interface sur les téléphones du foyer réalisée ici : essai utilisateur requis.
- Le traitement séparé des bonus sans joint est conservé comme principe, mais le flux complet de réception/confirmation entre comptes personnels doit être finalisé et testé avant publication.
- Le moteur d'historique du LAB conserve ses archives dans l'environnement local de test ; transposition dans le schéma Firebase V9 à valider.
- La version officielle V8.3 ne doit pas être remplacée sans accord de l'utilisateur.
