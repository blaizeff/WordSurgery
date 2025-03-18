export interface Translation {
    [key: string]: string;
}

export interface Locale {
    [key: string]: Translation;
}

export interface LocaleMap {
    [key: string]: Locale;
}

export const localeMap: LocaleMap = {
    en: {
        splash: {
            loading: "Loading...",
        },
        menu: {
            title: "Word Surgery",
            subtitle: "Select a language to start playing",
            button_start_game: "Start Game",
            button_add_dictionary: "+  Add Custom Dictionary",
            button_english: "English",
            button_french: "French",
            button_custom_dictionary: "Custom Dictionary",
            loading: "Loading dictionary...",
            modal_title: "Add Custom Dictionary",
            modal_subtitle: "Enter the URL of a JSON file containing an array of words",
        }
    },
    fr: {
        splash: {
            loading: "Chargement...",
        },
        menu: {
            title: "Word Surgery",
            subtitle: "Sélectionnez une langue pour commencer",
            button_start_game: "Commencer le jeu",
            button_add_dictionary: "+  Ajouter un dictionnaire personnalisé",
            button_english: "Anglais", 
            button_french: "Français",
            button_custom_dictionary: "Dictionnaire personnalisé",
            loading: "Chargement du dictionnaire...",
            modal_title: "Ajouter un dictionnaire personnalisé",
            modal_subtitle: "Entrez l'URL du fichier JSON contenant un tableau de mots",
        }
    }
};

