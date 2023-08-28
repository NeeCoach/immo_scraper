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
  const response = await fetch("https://www.immobilier.notaires.fr/pub-services/inotr-www-annonces/v1/annonces?offset=0&page=1&parPage=12&perimetre=0&tri=DATE_MODIFICATION_DESC&typeBiens=MAI&surfaceMin=80&prixMax=310000&typeTransactions=VENTE,VNI,VAE&localites=19128,19119,19089,19043,18971,19085,19128,19142,38877,18946,18960,19006,19015,19065,19120,18973,38852,18942,18950,18982,18988,19040,38847,38848,19000,38860,38861,18952,19067,18992,19134,18999,19146,18962,19126,19035,19036,19037,19038");
  const jsonResponse = await response.json();
  const annonces = jsonResponse.annonceResumeDto.map((annonce) => {
    annonce.id_unique = `id_immobilier-notaires-fr_${annonce.id}`;
    return annonce;
  });
  return annonces;
}


// Fonction pour récupérer les annonces sur ImmoFCMS
async function getAnnoncesImmoFCMS() {
  const response = await fetch("https://fi-classified-search-api.immo.fcms.io/web/classifieds?location=nantes%20(44)&location=coueron%20(44)&location=indre%20(44)&location=cordemais%20(44)&location=saint%20etienne%20de%20montluc%20(44)&location=malville%20(44)&location=sautron%20(44)&location=orvault%20(44)&location=saint%20herblain%20(44)&location=la%20chapelle%20sur%20erdre%20(44)&location=treillieres%20(44)&location=heric%20(44)&location=vertou%20(44)&location=vigneux%20de%20bretagne%20(44)&location=grandchamps%20des%20fontaines%20(44)&transaction=vente&types=maison&originSite=figimmo&sort=5&priceMax=310000&areaMin=60&groundAreaMin=40&path=/annonces/immobilier-vente-maison-nantes+44000.html&currentPage=1&pageSize=31", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "",
      "sec-ch-ua": "\"Brave\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "sec-gpc": "1",
      "x-api-key": `${process.env.API_KEY}`,
      "Referer": "https://immobilier.lefigaro.fr/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    "body": null,
    "method": "GET"
  });

  const jsonResponse = await response.json();
  let annonces = [];
  annonces = jsonResponse.classifieds.filter((annonce) => !annonce.type.includes("neuve")).map((annonce) => {
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
      newAnnonces += `- Surface du terrain : ${annonce.areaGround} m²\n`;
      newAnnonces += `- Prix : ${Number(annonce.price).toFixed()} €\n`;
      newAnnonces += `- Lien : ${annonce.recordLink}\n\n`;
    });
  }

  if (notaireNewAnnonces.length === 0 && immoFCMSNewAnnonces.length === 0) {
    console.log("Pas de nouvelle annonce pour le moment");
    return;
  }


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
