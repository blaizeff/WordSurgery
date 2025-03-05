import { Letter } from "../interfaces/Letter";

export class Word {
    letters: Letter[];

    constructor(word: string) {
        this.letters = word.split('').map((letter: string) => ({ letter, isAvailable: true }));
    }

    getLetters(): Letter[] {
        return this.letters;
    }
}