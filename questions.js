// Banque de questions — culture générale congolaise (RDC).
// 4 tours de difficulté croissante ; chaque tour tire 10 questions parmi 15,
// en mélangeant les sujets et les formats :
//   - QCM : `options`, la PREMIÈRE est la bonne (l'ordre est mélangé en jeu) ;
//   - Vrai/Faux : `tf: true | false` ;
//   - Image : `mask` (photo d'une œuvre de src/masks.js) + `options`.

const tf = (answer, category, text, fact) => ({ category, text, tf: answer, fact });

export const ROUNDS = [
  {
    id: 'decouverte',
    title: 'Découverte',
    subtitle: 'Les incontournables pour bien commencer',
    mask: 'kongo-nkisi',
    pool: [
      { category: 'Histoire', text: 'En quelle année la RDC a-t-elle obtenu son indépendance ?', options: ['1960', '1958', '1965', '1971'], fact: "L'indépendance a été proclamée le 30 juin 1960 à Léopoldville, l'actuelle Kinshasa." },
      { category: 'Géographie', text: 'Quel fleuve, le 2e plus puissant du monde par son débit, traverse la RDC ?', options: ['Le fleuve Congo', 'Le Nil', 'Le Niger', 'Le Zambèze'], fact: 'Seul l’Amazone a un débit plus important que le fleuve Congo.' },
      { category: 'Sport', text: "Quel est le surnom de l'équipe nationale de football de la RDC ?", options: ['Les Léopards', 'Les Lions Indomptables', 'Les Éléphants', 'Les Aigles'], fact: "En 1974, le Zaïre devient la première nation d'Afrique subsaharienne à disputer une Coupe du monde." },
      { category: 'Langues', text: 'Que veut dire « Mbote » en lingala ?', options: ['Bonjour', 'Merci', 'Au revoir', 'À table'], fact: 'Et pour dire merci en lingala : « Matondo ».' },
      { category: 'Géographie', text: "Quel était l'ancien nom de Kinshasa ?", options: ['Léopoldville', 'Élisabethville', 'Stanleyville', 'Coquilhatville'], fact: 'La ville a été rebaptisée en 1966. Coquilhatville est l’actuelle Mbandaka.' },
      { category: 'Nature', text: "Quel animal, cousin de la girafe, ne vit à l'état sauvage qu'en RDC ?", options: ["L'okapi", 'Le zèbre', 'Le bongo', 'Le gnou'], fact: "Décrit par les scientifiques en 1901, l'okapi vit caché dans la forêt de l'Ituri." },
      { category: 'Gastronomie', text: 'Le pondu, plat incontournable, est préparé à partir de feuilles de…', options: ['Manioc', 'Patate douce', 'Bananier', 'Baobab'], fact: 'On le savoure avec du fufu, de la chikwangue ou du makayabu (poisson salé).' },
      { category: 'Économie', text: 'Quelle est la monnaie officielle de la RDC ?', options: ['Le franc congolais', 'Le zaïre', 'Le franc CFA', 'Le shilling'], fact: 'Le franc congolais a remplacé le nouveau zaïre en 1998.' },
      { category: 'Sport', text: 'En 1974, Kinshasa accueille le « Rumble in the Jungle ». Qui affronte George Foreman ?', options: ['Muhammad Ali', 'Joe Frazier', 'Mike Tyson', 'Sugar Ray Leonard'], fact: 'Ali remporte le combat par KO au 8e round, sous les cris de « Ali, boma ye ! ».' },
      { category: 'Culture', text: 'Que signifie l’acronyme « SAPE » ?', options: ['Société des Ambianceurs et des Personnes Élégantes', 'Syndicat des Artistes Populaires et Engagés', 'Société Africaine du Prêt-à-porter Élégant', 'Salon des Artistes et Peintres Émergents'], fact: 'Les sapeurs font de l’élégance un art de vivre, de Kinshasa à Brazzaville.' },
      { category: 'Musique', text: 'Quel artiste est surnommé « le roi de la rumba rock » et le « pape de la SAPE » ?', options: ['Papa Wemba', 'Koffi Olomidé', 'Werrason', 'Fally Ipupa'], fact: 'Papa Wemba a fondé l’orchestre Viva La Musica à Kinshasa en 1977.' },
      tf(true, 'Géographie', 'Kinshasa est la capitale de la RDC.', 'C’est l’une des plus grandes villes d’Afrique, avec plus de 15 millions d’habitants.'),
      tf(true, 'Langues', 'Le lingala fait partie des quatre langues nationales de la RDC.', 'Les autres sont le kikongo, le swahili et le tshiluba ; le français est la langue officielle.'),
      tf(true, 'Symboles', 'Le drapeau de la RDC porte une étoile jaune.', 'Fond bleu ciel, étoile jaune dans le coin, et bande rouge bordée de jaune en diagonale.'),
      { category: 'Art', mask: 'kongo-nkisi', text: 'Cette statue hérissée de clous est un « nkisi nkondi ». De quel peuple vient-elle ?', options: ['Kongo', 'Kuba', 'Luba', 'Pende'], fact: 'Chaque clou planté scellait un serment ou une demande adressée à la force du nkisi.' },
    ],
  },
  {
    id: 'connaisseur',
    title: 'Connaisseur',
    subtitle: 'Pour ceux qui connaissent le pays',
    mask: 'kuba-bwoom',
    pool: [
      { category: 'Histoire', text: 'Qui fut le premier Premier ministre du Congo indépendant ?', options: ['Patrice Lumumba', 'Joseph Kasa-Vubu', 'Moïse Tshombe', 'Mobutu Sese Seko'], fact: 'Son discours du 30 juin 1960, prononcé devant le roi Baudouin, est resté célèbre.' },
      { category: 'Histoire', text: 'Qui fut le premier président de la République du Congo indépendant ?', options: ['Joseph Kasa-Vubu', 'Patrice Lumumba', 'Mobutu Sese Seko', 'Moïse Tshombe'], fact: 'Kasa-Vubu a dirigé le pays de 1960 à 1965, avant la prise de pouvoir de Mobutu.' },
      { category: 'Histoire', text: 'Sous quel nom le pays était-il connu entre 1971 et 1997 ?', options: ['Zaïre', 'Congo-Léopoldville', 'Royaume Kongo', 'Congo belge'], fact: 'Le nom « Zaïre » vient d’un mot kikongo signifiant « le fleuve qui avale toutes les rivières ».' },
      { category: 'Musique', text: 'Quel artiste a composé « Indépendance Cha Cha » en 1960 ?', options: ['Le Grand Kallé', 'Franco Luambo', 'Papa Wemba', 'Tabu Ley Rochereau'], fact: "Joseph Kabasele, dit le Grand Kallé, l'a enregistrée avec son orchestre African Jazz." },
      { category: 'Musique', text: 'Quel orchestre mythique était dirigé par Franco Luambo ?', options: ['TPOK Jazz', 'Wenge Musica', 'Zaïko Langa Langa', 'Viva La Musica'], fact: 'Franco était surnommé « le Grand Maître » et « le sorcier de la guitare ».' },
      { category: 'Culture', text: "En quelle année la rumba congolaise a-t-elle été inscrite au patrimoine immatériel de l'UNESCO ?", options: ['2021', '2015', '2010', '2023'], fact: 'La candidature a été portée conjointement par la RDC et le Congo-Brazzaville.' },
      { category: 'Géographie', text: 'Combien de provinces compte la RDC depuis le découpage de 2015 ?', options: ['26', '11', '21', '31'], fact: 'Le pays est passé de 11 à 26 provinces, dont la ville-province de Kinshasa.' },
      { category: 'Géographie', text: 'Quel lac, partagé par la RDC, est le deuxième plus profond du monde ?', options: ['Le lac Tanganyika', 'Le lac Kivu', 'Le lac Albert', 'Le lac Mai-Ndombe'], fact: 'Le Tanganyika dépasse 1 400 m de profondeur, juste derrière le lac Baïkal.' },
      { category: 'Nature', text: "Quel parc national congolais, créé en 1925, est le plus ancien d'Afrique ?", options: ['Virunga', 'Kahuzi-Biega', 'Garamba', 'Salonga'], fact: 'Les Virunga abritent les célèbres gorilles des montagnes et le volcan Nyiragongo.' },
      { category: 'Sport', text: 'Quel basketteur congolais, légende de la NBA, était célèbre pour son « finger wag » ?', options: ['Dikembe Mutombo', 'Bismack Biyombo', 'Christian Eyenga', 'Emmanuel Mudiay'], fact: 'Mutombo est entré au Hall of Fame en 2015 et a été élu 4 fois meilleur défenseur de l’année.' },
      { category: 'Gastronomie', text: 'Comment s’appelle la pâte de manioc fermentée, emballée dans des feuilles ?', options: ['La chikwangue', 'L’attiéké', 'L’injera', 'Le couscous'], fact: 'On l’appelle aussi « kwanga ». Elle se conserve plusieurs jours dans ses feuilles.' },
      { category: 'Langues', text: "Laquelle de ces langues n'est PAS une langue nationale de la RDC ?", options: ['Le wolof', 'Le lingala', 'Le swahili', 'Le tshiluba'], fact: 'Les quatre langues nationales sont le lingala, le kikongo, le swahili et le tshiluba.' },
      tf(true, 'Nature', 'Le bonobo ne vit à l’état sauvage qu’en RDC.', 'On ne le trouve qu’au sud du fleuve Congo, qui le sépare des chimpanzés.'),
      tf(false, 'Géographie', 'La RDC est le plus grand pays d’Afrique par sa superficie.', 'Avec 2,3 millions de km², elle est deuxième, juste derrière l’Algérie.'),
      { category: 'Art', mask: 'kuba-bwoom', text: 'De quel peuple vient ce masque Bwoom ?', options: ['Kuba', 'Pende', 'Yaka', 'Songye'], fact: 'Le Bwoom est l’un des trois grands masques royaux du royaume Kuba, au Kasaï.' },
    ],
  },
  {
    id: 'initie',
    title: 'Initié',
    subtitle: 'Histoire, arts et terres de l’Est',
    mask: 'yaka-ndeemba',
    pool: [
      { category: 'Histoire', text: 'Quel roi belge possédait l’État indépendant du Congo à titre personnel ?', options: ['Léopold II', 'Albert Ier', 'Baudouin', 'Léopold III'], fact: 'De 1885 à 1908, le territoire fut la propriété privée du roi, une période marquée par de terribles exactions.' },
      { category: 'Histoire', text: 'En quelle année le territoire devient-il officiellement le « Congo belge » ?', options: ['1908', '1885', '1919', '1945'], fact: 'La Belgique reprend alors la colonie, qui garde ce nom jusqu’en 1960.' },
      { category: 'Histoire', text: 'Quel ancien royaume s’étendait sur l’ouest de la RDC et une partie de l’Angola ?', options: ['Le royaume Kongo', 'L’empire du Mali', 'Le royaume ashanti', 'L’empire songhaï'], fact: 'Sa capitale, Mbanza Kongo, se trouve dans l’actuel Angola.' },
      { category: 'Histoire', text: 'Quel était l’ancien nom de Lubumbashi ?', options: ['Élisabethville', 'Léopoldville', 'Stanleyville', 'Jadotville'], fact: 'Stanleyville est devenue Kisangani et Jadotville a pris le nom de Likasi.' },
      { category: 'Histoire', text: 'Qui prend le pouvoir en 1997 après la chute de Mobutu ?', options: ['Laurent-Désiré Kabila', 'Joseph Kabila', 'Étienne Tshisekedi', 'Jean-Pierre Bemba'], fact: 'Il rebaptise aussitôt le pays « République démocratique du Congo ».' },
      { category: 'Politique', text: 'Quel président est entré en fonction en janvier 2019 ?', options: ['Félix Tshisekedi', 'Joseph Kabila', 'Martin Fayulu', 'Moïse Katumbi'], fact: 'Fils de l’opposant historique Étienne Tshisekedi, il a été réélu en décembre 2023.' },
      { category: 'Musique', text: 'Avant Viva La Musica, Papa Wemba a cofondé quel orchestre en 1969 ?', options: ['Zaïko Langa Langa', 'TPOK Jazz', 'African Fiesta', 'Wenge Musica'], fact: 'Zaïko Langa Langa a lancé de nombreuses stars de la rumba moderne.' },
      { category: 'Musique', text: 'Dans quel groupe Fally Ipupa a-t-il fait ses débuts ?', options: ['Quartier Latin', 'Wenge Musica Maison Mère', 'Viva La Musica', 'Zaïko Langa Langa'], fact: 'Surnommé « Dicap la Merveille », il lance sa carrière solo en 2006.' },
      { category: 'Musique', text: 'Quel instrument traditionnel est fait de lamelles métalliques fixées sur une caisse de résonance ?', options: ['Le likembe', 'Le djembé', 'La kora', 'Le balafon'], fact: 'Aussi appelé sanza, il se joue avec les pouces.' },
      { category: 'Géographie', text: 'Quel est le point culminant de la RDC ?', options: ['Le pic Marguerite', 'Le Nyiragongo', 'Le mont Karisimbi', 'Le mont Kenya'], fact: 'Il culmine à 5 109 m dans le massif du Ruwenzori, à la frontière avec l’Ouganda.' },
      { category: 'Géographie', text: 'Quelle ville se trouve au bord du lac Kivu, au pied du volcan Nyiragongo ?', options: ['Goma', 'Kisangani', 'Mbandaka', 'Matadi'], fact: 'Le Nyiragongo abrite l’un des plus grands lacs de lave du monde.' },
      { category: 'Géographie', text: 'Quelle ville est le principal port maritime de la RDC ?', options: ['Matadi', 'Kisangani', 'Kindu', 'Kananga'], fact: 'Situé sur le fleuve Congo, Matadi est à environ 150 km de l’océan Atlantique.' },
      tf(true, 'Géographie', 'Le fleuve Congo traverse deux fois l’équateur.', 'C’est le seul grand fleuve du monde à le faire, ce qui lui assure un débit puissant toute l’année.'),
      { category: 'Art', mask: 'pende-gambanda', text: 'Ce masque féminin aux paupières baissées est typique de quel peuple ?', options: ['Pende', 'Kongo', 'Bembe', 'Luba'], fact: 'Chez les Pende, ces masques mbuya dansent lors des fêtes qui suivent l’initiation des garçons.' },
      { category: 'Art', mask: 'songye-nkishi', text: 'Cette figure de pouvoir « nkishi » vient de quel peuple ?', options: ['Songye', 'Kuba', 'Yaka', 'Teke'], fact: 'Un nganga (devin-guérisseur) la chargeait de substances pour protéger toute la communauté.' },
    ],
  },
  {
    id: 'sage',
    title: 'Sage de Kin',
    subtitle: 'Le niveau des grands prêtres',
    mask: 'suku-hemba',
    pool: [
      { category: 'Art', text: 'Les célèbres « velours du Kasaï » du peuple Kuba sont tissés en…', options: ['Raphia', 'Coton', 'Soie', 'Laine'], fact: 'Leurs motifs géométriques ont inspiré de nombreux artistes, dont Matisse et Klee.' },
      { category: 'Art', text: 'Quel peintre kinois est une figure majeure de la « peinture populaire » congolaise ?', options: ['Chéri Samba', 'El Anatsui', 'Ousmane Sow', 'Malick Sidibé'], fact: 'Ses toiles mêlent images et textes, et sont exposées dans les grands musées du monde.' },
      { category: 'Sport', text: 'Quel club de Lubumbashi a remporté cinq fois la Ligue des champions africaine ?', options: ['TP Mazembe', 'AS Vita Club', 'DCMP', 'Simba SC'], fact: 'En 2010, il devient le premier club africain à atteindre la finale de la Coupe du monde des clubs.' },
      { category: 'Économie', text: 'La RDC est le premier producteur mondial de quel minerai stratégique ?', options: ['Le cobalt', 'Le platine', "L'aluminium", 'Le nickel'], fact: 'Le cobalt, essentiel aux batteries, provient surtout de l’ex-Katanga.' },
      { category: 'Histoire', text: 'Quel était l’ancien nom de Kisangani ?', options: ['Stanleyville', 'Élisabethville', 'Coquilhatville', 'Jadotville'], fact: 'La ville, au cœur du pays, est située juste en aval des chutes Boyoma.' },
      { category: 'Histoire', text: 'Quel était le nom de Mobutu Sese Seko avant 1972 ?', options: ['Joseph-Désiré Mobutu', 'Laurent-Désiré Kabila', 'Joseph-Albert Malula', 'Jean-Pierre Bemba'], fact: 'Il change de nom en pleine politique d’« authenticité », qui bannit les prénoms chrétiens.' },
      { category: 'Histoire', text: 'Comment s’appelle la politique de Mobutu qui remplaça les prénoms chrétiens par des noms africains ?', options: ['L’authenticité', 'La zaïrianisation', 'La négritude', 'Le panafricanisme'], fact: 'Le costume occidental est alors remplacé par l’« abacost », pour « à bas le costume ».' },
      { category: 'Science', text: 'Quel scientifique congolais a participé à la découverte du virus Ebola en 1976 ?', options: ['Jean-Jacques Muyembe', 'Denis Mukwege', 'Joseph-Albert Malula', 'Paul Panda Farnana'], fact: 'Il a aussi contribué à mettre au point un traitement par anticorps contre Ebola.' },
      { category: 'Société', text: 'Quel médecin congolais a reçu le prix Nobel de la paix en 2018 ?', options: ['Denis Mukwege', 'Jean-Jacques Muyembe', 'Étienne Tshisekedi', 'Dikembe Mutombo'], fact: 'Il soigne les femmes victimes de violences sexuelles à l’hôpital de Panzi, à Bukavu.' },
      { category: 'Géographie', text: 'Quelle rivière forme une grande partie de la frontière avec la Centrafrique ?', options: ['L’Oubangui', 'Le Kasaï', 'Le Lualaba', 'Le Kwango'], fact: 'C’est le principal affluent de la rive droite du fleuve Congo.' },
      { category: 'Géographie', text: 'Comment s’appelle le cours supérieur du fleuve Congo ?', options: ['Le Lualaba', 'Le Kasaï', 'L’Oubangui', 'Le Sankuru'], fact: 'Le fleuve prend le nom de Congo en aval des chutes Boyoma, près de Kisangani.' },
      tf(true, 'Énergie', 'Le site d’Inga, célèbre pour ses barrages, se trouve sur le fleuve Congo.', 'Le projet Grand Inga pourrait devenir le plus grand complexe hydroélectrique du monde.'),
      tf(false, 'Nature', 'Le Nyiragongo est un volcan éteint.', 'Il est très actif : sa dernière grande éruption a menacé Goma en mai 2021.'),
      { category: 'Art', mask: 'yaka-ndeemba', text: 'Ce masque à franges de raphia est porté lors de l’initiation chez quel peuple ?', options: ['Yaka', 'Kuba', 'Songye', 'Luba'], fact: 'Chez les Yaka, les masques ndeemba dansent à la sortie des jeunes initiés.' },
      { category: 'Art', mask: 'suku-hemba', text: 'Ce masque-heaume « hemba » vient de quel peuple du Kwango ?', options: ['Suku', 'Pende', 'Kongo', 'Bembe'], fact: 'Les Suku vivent dans la région du Kwango, au sud-ouest de la RDC.' },
    ],
  },
].map((round) => ({ ...round, pool: round.pool.map(normalize) }));

export const ROUND_SIZE = 10;

/** Forme commune : `options` + `correct` (index de la bonne réponse) + `fixed` (ordre à garder). */
function normalize(q) {
  if (typeof q.tf === 'boolean') {
    return { ...q, type: 'tf', options: ['Vrai', 'Faux'], correct: q.tf ? 0 : 1, fixed: true };
  }
  return { ...q, type: q.mask ? 'image' : 'choice', correct: 0, fixed: false };
}

// Mode multijoueur : questions sans photo (l'écran géant n'affiche pas les œuvres).
export const QUESTION_BANK = ROUNDS.flatMap((round) => round.pool).filter((q) => q.type !== 'image');
