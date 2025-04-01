import { localeMap } from '../utils/localeUtils';

export const useTranslation = (language: string) => {
    const t = (translationKey: string) => {
        const locale = language === 'custom' ? 'en' : language;
        
        try {
            const [section, key] = translationKey.split('.');
            return localeMap[locale][section][key];
        } catch (error) {
            console.warn(`Translation not found for key: ${translationKey}, language: ${locale}`);
            try {
                const [section, key] = translationKey.split('.');
                return localeMap['en'][section][key];
            } catch (error) {
                return translationKey;
            }
        }
    };
    return { t };
};