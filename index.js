// import node environment variables
require("dotenv").config();
const nodemailer = require("nodemailer");

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

  let annoncesText = newAnnonces.map((annonce) => {
    return `Une nouvelle annonce est disponible sur ${annonce.source} : ${annonce.url}\n`;
  }).join("");

  let info = await transporter.sendMail({
    from: process.env.EMAIL, 
    to: process.env.EMAIL, 
    subject: "Nouvelles annonces immobilières disponibles !",
    text: annoncesText,
  });
}


// Fonction pour récupérer les annonces du site immobilier.notaires.fr
async function getAnnoncesImmobilierNotaire() {
  const response = await fetch(
    "https://www.immobilier.notaires.fr/pub-services/inotr-www-annonces/v1/annonces?offset=0&page=1&parPage=12&perimetre=0&typeBiens=MAI&prixMax=275000&typeTransactions=VENTE,VNI,VAE&localites=19043,19119,19085,18971,18992,18999,19142,19134");
  const jsonResponse = await response.json();
  const annonces = jsonResponse.annonceResumeDto.map((annonce) => {
    annonce.id_unique = `id_immobilier-notaires-fr_${annonce.id}`;
    return annonce;
  });
  return annonces;
}


// Fonction pour récupérer les annonces sur ImmoFCMS
async function getAnnoncesImmoFCMS() {
  const response = await fetch("https://fi-classified-search-api.immo.fcms.io/classifieds-with-size?location=nantes%20(44)&location=sautron%20(44)&location=orvault%20(44)&location=saint%20herblain%20(44)&location=cordemais%20(44)&location=vigneux%20de%20bretagne%20(44)&location=saint%20etienne%20de%20montluc%20(44)&location=malville%20(44)&location=heric%20(44)&transaction=vente&types=maison&types=maison+neuve&types=atelier&types=chalet&types=chambre+d%27h%C3%B4te&types=manoir&types=moulin&types=propri%C3%A9t%C3%A9&types=ferme&types=g%C3%AEte&types=villa&sort=5&priceMax=285000&areaMin=60&currentPage=1&pageSize=31", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "",
      "sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Brave\";v=\"110\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "sec-gpc": "1",
      "x-api-key": process.env.API_KEY,
      "Referer": "https://immobilier.lefigaro.fr/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    "body": null,
    "method": "GET"
  });  const jsonResponse = await response.json();
  
  let annonces = [];
  annonces = jsonResponse.classifieds.map((annonce) => {
      annonce.id_unique = `id_figaroimmobilier-fr_${annonce.id}`;
      return annonce;
    });
  return annonces;
}

let lastAnnonces = null;

// Fonction pour vérifier s'il y a de nouvelles annonces
async function checkNewAnnonces() {
  const notaireAnnonces = await getAnnoncesImmobilierNotaire();
  const immoFCMSAnnonces = await getAnnoncesImmoFCMS();

  if (lastAnnonces === null) {
    // Il n'y a pas encore d'annonces enregistrées, donc on les enregistre toutes
    lastAnnonces = [...notaireAnnonces, ...immoFCMSAnnonces];
    console.log("Le programme a démarré, les annonces ont été enregistrées");
    return;
  }

  const notaireNewAnnonces = getNewAnnonces(lastAnnonces, notaireAnnonces, "id_unique");
  const immoFCMSNewAnnonces = getNewAnnonces(lastAnnonces, immoFCMSAnnonces, "id_unique");

  let newAnnonces = "";

  if (notaireNewAnnonces.length > 0) {
    newAnnonces += `Nouvelles annonces disponibles sur Notaire :\n`;
    notaireNewAnnonces.forEach((annonce) => {
      newAnnonces += `- ${annonce.urlDetailAnnonceFr}\n`;
    });
  }

  if (immoFCMSNewAnnonces.length > 0) {
    newAnnonces += `Nouvelles annonces disponibles sur ImmoFCMS :\n`;
    immoFCMSNewAnnonces.forEach((annonce) => {
      newAnnonces += `- ${annonce.recordLink}\n`;
    });
  }

  if (notaireNewAnnonces.length === 0 && immoFCMSNewAnnonces.length === 0) {
    console.log("Pas de nouvelle annonce pour le moment");
    return;
  }

  console.log(newAnnonces);

  await sendEmail({
    subject: "Nouvelles annonces immobilières",
    text: newAnnonces,
  });

  lastAnnonces = [...notaireAnnonces, ...immoFCMSAnnonces];
}


// Fonction générique pour récupérer les nouvelles annonces
function getNewAnnonces(lastAnnonces, annonces, id_unique) {
  const newAnnonces = annonces.filter((annonce) => {
    return !lastAnnonces.some((lastAnnonce) => lastAnnonce[id_unique] === annonce[id_unique]);
  });
  return newAnnonces;
}

// Vérifier s'il y a de nouvelles annonces toutes les minutes
setInterval(checkNewAnnonces, 60000);