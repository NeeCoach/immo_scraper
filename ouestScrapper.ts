import { ApiResponse } from "./IAds";

const ouestFranceScrapper = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      Referer: "https://www.ouestfrance-immo.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    body: null,
    method: "GET",
  });
  const ouestResponse = (await response.json()) as ApiResponse;
  return ouestResponse.data;
};

ouestFranceScrapper(
  "https://www-api.ouestfrance-immo.com/api/annonces/?ids=17590543%2C17816304%2C17831616%2C18022738%2C17987745%2C17891240%2C18005781%2C18023492%2C17966600%2C17896857%2C17951126%2C17698027%2C17844092%2C17900537%2C17685450%2C18022325%2C17617399%2C17918548%2C18019374%2C18021654&limit=0&tri=fieldIds"
);
