import type { Transcript } from './Transcript';
import { checklistIsEmpty } from './StopConditions';

export type TurnEngineConfig = {
  maxTurns: number;
  stopCondition: 'maxTurns' | 'checklistEmpty';
};

export class TurnEngine {
  private turns = 0;

  constructor(private cfg: TurnEngineConfig) {}

  getTurnCount(): number {
    return this.turns;
  }

  incrementTurn(): void {
    this.turns++;
  }

  shouldStop(transcript: Transcript): boolean {
    if (this.turns >= this.cfg.maxTurns) {
      return true;
    }

    if (this.cfg.stopCondition === 'checklistEmpty') {
      const last = transcript.getLastAssistantText();
      if (last && checklistIsEmpty(last)) {
        return true;
      }
    }

    return false;
  }
}
