import { describe, expect, it } from 'vitest';
import { GameState } from '../src/game/GameState';
import { BEST_KEY, ScoreSystem } from '../src/game/systems/ScoreSystem';

describe('state machine and score lifecycle', () => {
  it('locks repeated input while placing and cannot spawn after game over', () => {
    const state = new GameState();
    expect(state.phase).toBe('ready');
    expect(state.transition('placing')).toBe(false);
    expect(state.transition('moving')).toBe(true);
    expect(state.transition('placing')).toBe(true);
    for (let i = 0; i < 20; i++) expect(state.transition('placing')).toBe(false);
    expect(state.transition('gameover')).toBe(true);
    expect(state.transition('moving')).toBe(false);
    expect(state.phase).toBe('gameover');
  });
  it('resets the phase for a fresh run', () => {
    const state = new GameState();
    state.transition('moving'); state.transition('placing'); state.transition('gameover');
    state.reset();
    expect(state.phase).toBe('ready');
    expect(state.transition('moving')).toBe(true);
  });
  it('excludes the base and persists the best across new sessions and retries', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const score = new ScoreSystem(storage);
    expect(score.floors).toBe(0);
    expect(score.addFloor()).toBe(1);
    score.addFloor();
    expect(score.finish()).toBe(true);
    expect(values.get(BEST_KEY)).toBe('2');
    score.reset();
    expect(score.floors).toBe(0);
    expect(score.best).toBe(2);
    expect(new ScoreSystem(storage).best).toBe(2);
    expect(score.finish()).toBe(false);
  });
  it.each(['NaN', '-1', 'Infinity', '3.7', '999999999999999999999'])('ignores corrupt best value %s', value => {
    expect(new ScoreSystem({ getItem: () => value, setItem: () => undefined }).best).toBe(0);
  });
  it('remains playable when reading and writing localStorage throws', () => {
    const score = new ScoreSystem({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } });
    score.addFloor();
    expect(() => score.finish()).not.toThrow();
    expect(score.best).toBe(1);
  });
});
