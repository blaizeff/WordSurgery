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
            button_change_dictionary: "Change Custom Dictionary",
            button_remove_dictionary: "Remove Custom Dictionary",
            button_english: "English",
            button_french: "French",
            button_custom_dictionary: "Custom Dictionary",
            loading: "Loading dictionary...",
            modal_title: "Add Custom Dictionary",
            modal_subtitle: "Enter the URL of a JSON file containing an array of words",
            remove_dictionary_title: "Remove Custom Dictionary",
            remove_dictionary_message: "This will revert to using the dictionary of the selected language. Are you sure?",
            cancel: "Cancel",
            add: "Add",
            remove: "Remove"
        },
        game: {
            title: "Word Surgery",
            back_button: "Back",
            button_play_again: "Play Again",
            button_undo: "Undo",
            game_completed: "Game Completed!",
            time_up: "Time's Up!",
            button_try_again: "Try Again",
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
            button_change_dictionary: "Changer le dictionnaire personnalisé",
            button_remove_dictionary: "Supprimer le dictionnaire personnalisé",
            button_english: "Anglais", 
            button_french: "Français",
            button_custom_dictionary: "Dictionnaire personnalisé",
            loading: "Chargement du dictionnaire...",
            modal_title: "Ajouter un dictionnaire personnalisé",
            modal_subtitle: "Entrez l'URL du fichier JSON contenant un tableau de mots",
            remove_dictionary_title: "Supprimer le dictionnaire personnalisé",
            remove_dictionary_message: "Cela reviendra à utiliser le dictionnaire du langage sélectionné. Êtes-vous sûr ?",
            cancel: "Annuler",
            add: "Ajouter",
            remove: "Supprimer"
        },
        game: {
            title: "Word Surgery",
            back_button: "Retour",
            button_undo: "Annuler",
            button_play_again: "Nouvelle partie",
            game_completed: "Partie terminée!",
            time_up: "Temps écoulé!",
            button_try_again: "Réessayer",
        }
    }
};

