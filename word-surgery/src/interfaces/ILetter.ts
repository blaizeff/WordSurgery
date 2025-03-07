export interface ILetter {
    value: string;
    isAvailable: boolean;
    initialPosition: number | undefined;
    originalIndex?: number;
    isCompleted?: boolean;
}