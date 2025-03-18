import { localeMap } from '../utils/localeUtils';

export const useTranslation = (language: string) => {
    const t = (translationKey: string) => {
        return localeMap[language][translationKey.split('.')[0]][translationKey.split('.')[1]];
    };
    return { t };
};