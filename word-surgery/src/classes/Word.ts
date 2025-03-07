import { ILetter } from "../interfaces/ILetter";

export class Word {
    letters: ILetter[];

    constructor(word: string, isMovable: boolean = false) {
        this.letters = word.split('').map((letterValue: string, index: number) => ({ value: letterValue, isAvailable: true, initialPosition: isMovable ? index : undefined }));
    }

    getLetters(): ILetter[] {
        return this.letters;
    }

    removeLetterAt(index: number): void {
        this.letters.splice(index, 1);
    }

    addLetterAt(letter: ILetter, index: number): void {
        this.letters.splice(index, 0, letter);
    }

    size(): number {
        return this.letters.length;
    }
}