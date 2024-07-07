// import node environment variables
const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendEmail(newAnnonces) {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: process.env.EMAIL,
    subject: "Nouvelles annonces immobilières disponibles !",
    text: newAnnonces.text,
  });
}

// Fonction pour récupérer les annonces du site immobilier.notaires.fr
async function getAnnoncesImmobilierNotaire() {
  const response = await fetch(
    "https://www.immobilier.notaires.fr/pub-services/inotr-www-annonces/v1/annonces?offset=0&page=1&parPage=12&perimetre=0&tri=DATE_MODIFICATION_DESC&typeBiens=MAI&surfaceMin=80&prixMax=290000&typeTransactions=VENTE,VNI,VAE&localites=19128,19085,19134,19119,18962,19015,18992,19089,19000,18971,19142,19126,19043,18999,38860,38861"
  );
  const jsonResponse = await response.json();
  console.log(jsonResponse.annonceResumeDto);
  const annonces = jsonResponse.annonceResumeDto.map((annonce) => {
    annonce.id_unique = `id_immobilier-notaires-fr_${annonce.id}`;
    return annonce;
  });
  return annonces;
}

// Fonction pour récupérer les annonces sur ImmoFCMS
async function getAnnoncesImmoFCMS() {
  const response = await fetch(
    "https://fi-classified-search-api.immo.fcms.io/web/classifieds?location=nantes%20(44)&location=coueron%20(44)&location=indre%20(44)&location=cordemais%20(44)&location=saint%20etienne%20de%20montluc%20(44)&location=malville%20(44)&location=sautron%20(44)&location=orvault%20(44)&location=saint%20herblain%20(44)&location=la%20chapelle%20sur%20erdre%20(44)&location=treillieres%20(44)&location=heric%20(44)&location=vertou%20(44)&location=vigneux%20de%20bretagne%20(44)&location=grandchamps%20des%20fontaines%20(44)&transaction=vente&types=maison&originSite=figimmo&sort=5&priceMax=285000&areaMin=60&groundAreaMin=40&path=/annonces/immobilier-vente-maison-nantes+44000.html&currentPage=1&pageSize=31",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "",
        "sec-ch-ua": '"Brave";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1",
        "x-api-key": `${process.env.API_KEY}`,
        Referer: "https://immobilier.lefigaro.fr/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: null,
      method: "GET",
    }
  );

  const jsonResponse = await response.json();
  console.log(jsonResponse.classifieds);
  let annonces = [];
  annonces = jsonResponse.classifieds
    .filter((annonce) => !annonce.type.includes("neuve"))
    .map((annonce) => {
      annonce.id_unique = `id_figaroimmobilier-fr_${annonce.id}`;
      return annonce;
    });
  return annonces;
}

let lastAnnonces = null;

// Fonction pour vérifier s'il y a de nouvelles annonces
async function checkNewAnnonces() {
  const notaireAnnonces = await getAnnoncesImmobilierNotaire();
  // const immoFCMSAnnonces = await getAnnoncesImmoFCMS();

  if (lastAnnonces === null) {
    // Il n'y a pas encore d'annonces enregistrées, donc on les enregistre toutes
    // lastAnnonces = [...notaireAnnonces, ...immoFCMSAnnonces];
    console.log("Le programme a démarré, les annonces ont été enregistrées");
    return;
  }

  const notaireNewAnnonces = getNewAnnonces(
    lastAnnonces,
    notaireAnnonces,
    "id_unique"
  );
  const immoFCMSNewAnnonces = getNewAnnonces(
    lastAnnonces,
    immoFCMSAnnonces,
    "id_unique"
  );

  let newAnnonces = "";

  if (notaireNewAnnonces.length > 0) {
    newAnnonces += `\n\nNouvelles annonces sur IMMOBILIER Notaire\n\n\n`;
    notaireNewAnnonces.forEach((annonce) => {
      newAnnonces += `---------------------------------------\n`;
      newAnnonces += `- Ville : ${annonce.localiteNom}\n`;
      newAnnonces += `- Surface : ${annonce.surface} m²\n`;
      newAnnonces += `- Prix : ${Number(annonce.prixTotal).toFixed()} €\n`;
      newAnnonces += `- Lien : ${annonce.urlDetailAnnonceFr}\n\n`;
    });
  }

  if (immoFCMSNewAnnonces.length > 0) {
    newAnnonces += `\n\nNouvelles annonces sur Figaro Immobilier\n\n\n`;
    immoFCMSNewAnnonces.forEach((annonce) => {
      console.log(annonce);
      newAnnonces += `---------------------------------------\n`;
      newAnnonces += `- Ville : ${annonce.locationNormalized}\n`;
      newAnnonces += `- Surface : ${annonce.area} m²\n`;
      newAnnonces += `- Surface du terrain : ${
        annonce?.areaGround ? annonce?.areaGround : "Non renseigné"
      } m²\n`;
      newAnnonces += `- Prix : ${Number(annonce.price).toFixed()} €\n`;
      newAnnonces += `- Lien : ${annonce.recordLink}\n\n`;
    });
  }

  if (notaireNewAnnonces.length === 0 && immoFCMSNewAnnonces.length === 0) {
    console.log("Pas de nouvelle annonce pour le moment");
    return;
  }

  // await sendEmail({
  //   subject: "Nouvelles annonces immobilières",
  //   text: newAnnonces,
  // });

  lastAnnonces = [...notaireAnnonces, ...immoFCMSAnnonces];
}

// Fonction générique pour récupérer les nouvelles annonces
function getNewAnnonces(lastAnnonces, annonces, id_unique) {
  const newAnnonces = annonces.filter((annonce) => {
    return !lastAnnonces.some(
      (lastAnnonce) => lastAnnonce[id_unique] === annonce[id_unique]
    );
  });
  return newAnnonces;
}

// Vérifier s'il y a de nouvelles annonces toutes les minutes
setInterval(checkNewAnnonces, 6000);

interface MockedResponse {
  annonces: Annonce[];
  message: string;
  count: number;
  nbPages: number;
  searches_logs: SearchLog[];
  description_elargissement: null;
  lieu_zone: null;
  titre_recherche: string;
  omr: OMR;
}

interface Annonce {
  id: number;
  typ: number;
  cla: null;
  tra: string;
  lie: number;
  id_parent: null;
  cnt: string;
  cli: number;
  vli: null;
  prix: number;
  tel: string;
  texte: string;
  date_deb_aff: string;
  nb_chambre: number;
  has_jardin: boolean;
  nb_photos: number;
  reference: string;
  nb_pieces: number;
  exposition: null;
  cuisine: null;
  nb_salles_de_bain: null;
  has_grenier: boolean;
  has_terrasse: boolean;
  proximite_transports: null;
  proximite_ecoles: null;
  proximite_commerces: null;
  type_chauffage: string | null;
  nb_etages: null;
  has_ascenseur: boolean;
  nb_stationnements: null;
  type_stationnement: string | null;
  surface_terrain: number | null;
  nb_chambres_rdc: null;
  nb_salles_d_eau: number | null;
  has_cave: boolean;
  has_veranda: boolean;
  etage: null;
  has_interphone: boolean;
  has_balcon: boolean;
  chauffage: string | null;
  surface: number;
  frais_agence: null;
  charges: number | null;
  disponibilite: null;
  video: null;
  pro: string;
  date_creation: string;
  dpe_chiffre: number | null;
  dpe_lettre: string;
  ges_chiffre: number | null;
  ges_lettre: string | null;
  exclu: boolean;
  nb_lots_copro: null;
  charges_copro: number | null;
  redressement_syndic: null;
  frais_pourcent: number;
  adresse_geoloc: string;
  lat: null;
  lng: null;
  date_prix_negocie: string | null;
  url_visite_virtuelle: null;
  is_pnf: boolean;
  typ_lib: string;
  typ_encode: string;
  cla_lib: null;
  cla_encode: null;
  lieu_id: number;
  lieu_lib: string;
  lieu_encode: string;
  baisse_prix_montant: null;
  baisse_prix_pourcent: null;
  has_parquet: boolean;
  has_placard: boolean;
  has_dressing: boolean;
  honoraires_etat_des_lieux: null;
  charges_vendeur: boolean | null;
  previsite_video: boolean;
  previsite_visite_virtuelle: boolean;
  departement_id: number;
  region_id: number;
  is_littoral: null;
  garantie: number;
  regul_charges: number;
  vue_mer: boolean;
  piscine: boolean;
  vendu: null;
  internet: null;
  dpe_date: string | null;
  conso_min: number | null;
  conso_max: number | null;
  plain_pied: boolean;
  loyer_encadre: null;
  loyer_hc: null;
  loyer_reference: null;
  loyer_complement: null;
  viager: boolean;
  rente: null;
  colocation: boolean;
  meuble: boolean;
  georisques: boolean;
  url_externe: null;
  annonce_tags: null;
  display_georisques: boolean;
  transac_lib: string;
  transac_lib_encode: string;
  quartier: null;
  lieu: Lieu;
  photo_url: string;
  photos: string[];
  tel2: string;
  cli_id_tan: string;
  client: Client;
  global_dpe_lettre: string | null;
  has_email: boolean;
  has_video: boolean;
  has_visite_virtuelle: boolean;
  is_geoloc: boolean;
}

interface Lieu {
  id: number;
  parentId: number;
  code: string | null;
  type: string;
  libelle: string;
  insee: string | null;
  cp: string | null;
  encode: string;
  lat: number;
  lng: number;
  nb_annonces: number;
  zoneId: string | null;
  littoral: number | null;
  population: number | null;
  lieudit: number;
  delegue: number;
  ancienne: number;
  slug_transac: string;
  slug_kl: string;
  libelle_prep: string;
  parent: Lieu;
  hasChildren: boolean;
  features: {
    lieuCreditAgricole: string;
  };
  hasQuartier?: boolean;
}

interface Client {
  id: number;
  lie: number;
  id_tan: string;
  matricule: string;
  sous_compte: string;
  siret: string;
  enseigne: string;
  raison_sociale: string;
  adresse: string;
  code_postal: string;
  lat: number;
  lng: number;
  date_maj: string;
  phonetracker: boolean;
  vitrine_nom: string;
  vitrine_telephone: string;
  vitrine_telephone_loc: string;
  vitrine_email: string;
  vitrine_email_loc: string;
  vitrine_logo: string;
  vitrine_photo: string;
  vitrine_accroche: string;
  vitrine_accroche2: null;
  vitrine_descriptif: string;
  vitrine_site: null;
  vitrine_site2: null;
  V3D_colors: null;
  V3D_actif: boolean;
  V3D_directeur_photo: null;
  V3D_photo_ofi: null;
  geoloc_actif: boolean;
  num_adresse_actif: boolean;
  autodiffusion: boolean;
  relance_bap: boolean;
  relance_email: string;
  encode: string;
  hasPackVisibilite: boolean;
  vitrine_adresse: string;
  vitrine_idlie: number;
  fb_page: null;
  opi_id: null;
  opi_rating: null;
  opi_survey: null;
  url_bareme: null;
  affichage_adresse_vente: number;
  superuser: number;
  tag: string;
  nb_vente: number;
  nb_loc: number;
  nb_vendu: number;
  nb_exclu: number;
  nb_pnf: number;
  has_annonces: boolean;
  contrat_actif: number;
  business_actif: number;
  opi_origin: null;
  nb_vente_maison: number;
  nb_vente_appartement: number;
  nb_loc_maison: number;
  nb_loc_appartement: number;
  vitrine_horaires: string;
  bpr_id: null;
  agenda_id: null;
  telephone: string;
  telephone2: null;
  fax: null;
  urlLogo: string;
  urlPhoto: string;
  urlDirecteurPhoto: string;
  hasPackEclu: boolean;
  libelle: string;
  appellation: string;
  vitrine: {
    adresse: string;
    cp: string;
    ville: string;
  };
  siren: string;
  url_tarifs: null;
  has_avis: boolean;
  avis: {
    note: null;
    total: null;
  };
  hasV3d: boolean;
  v3d: {
    url_vitrine: null;
    url_liste: null;
  };
  lieu: Lieu;
}

interface SearchLog {
  request: {
    url: string;
    search_key: string;
    prix_max: string;
    surface_min: string;
    idslieu: string;
    tra: string;
    typIds: string;
  };
  ids: {
    id: number;
    prix: number;
  }[];
  step: number;
}

interface OMR {
  title: string;
  description: string;
  h1: string[];
  low_price: number;
  high_price: number;
}
