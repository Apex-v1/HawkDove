// lib/store.ts
// In-memory game state. In production this would be a database (e.g. Vercel KV).
// For simplicity and zero-cost hosting, we use a server-side singleton.

export type Choice = 'hawk' | 'dove'
export type Week = 1 | 2

export interface Player {
  id: string
  name: string
  email: string
  points: number
  cardNumber: number // 0-3, the bottom-right number
  playHistory: ('red' | 'black')[]
  choice?: Choice
  hasSubmitted: boolean
  isEliminated: boolean
  // Week 2
  staplePairId?: string // id of partner if stapled
  stapleRound?: number  // round they were stapled
  isHawkInStaple?: boolean
  wantsReturnToHawk?: boolean // week2: dove deciding if they want to staple
}

export interface Pairing {
  id: string
  playerAId: string
  playerBId: string
  choiceA?: Choice
  choiceB?: Choice
  resolved: boolean
  result?: PairingResult
  isStapled?: boolean
}

export interface PairingResult {
  playerAPointsDelta: number
  playerBPointsDelta: number
  summary: string
  diceRoll?: number // for D-D random bonus
  coinFlip?: 'heads' | 'tails' // for H-H tie
}

export interface Round {
  number: number
  pairings: Pairing[]
  resolved: boolean
  week: Week
}

export interface GameState {
  week: Week
  roundNumber: number
  phase: 'lobby' | 'submit' | 'reveal' | 'resolved'
  players: Player[]
  rounds: Round[]
  currentPairings: Pairing[]
  sessionStarted: boolean
  adminMessage: string
}

function createInitialState(): GameState {
  return {
    week: 1,
    roundNumber: 0,
    phase: 'lobby',
    players: [],
    rounds: [],
    currentPairings: [],
    sessionStarted: false,
    adminMessage: '',
  }
}

// Server-side singleton
let gameState: GameState = createInitialState()

export function getGameState(): GameState {
  return gameState
}

export function resetGame(): GameState {
  gameState = createInitialState()
  return gameState
}

export function setWeek(week: Week): GameState {
  gameState.week = week
  return gameState
}

export function addPlayer(name: string, email: string, cardNumber: number): Player {
  const id = `player_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const player: Player = {
    id,
    name,
    email,
    points: 100,
    cardNumber,
    playHistory: [],
    hasSubmitted: false,
    isEliminated: false,
  }
  gameState.players.push(player)
  return player
}

export function submitChoice(playerId: string, choice: Choice): boolean {
  const player = gameState.players.find(p => p.id === playerId)
  if (!player || player.hasSubmitted) return false
  player.choice = choice
  player.hasSubmitted = true
  return true
}

export function startRound(): Round {
  // Reset submissions
  gameState.players.forEach(p => {
    if (!p.isEliminated) {
      p.hasSubmitted = false
      p.choice = undefined
    }
  })

  gameState.phase = 'submit'
  gameState.roundNumber++

  // Generate pairings
  const activePlayers = gameState.players.filter(p => !p.isEliminated)

  let pairings: Pairing[] = []

  if (gameState.week === 2) {
    // Week 2: stapled pairs are locked
    const stapledIds = new Set<string>()
    const stapledPairs: Pairing[] = []

    activePlayers.forEach(p => {
      if (p.staplePairId && !stapledIds.has(p.id)) {
        const partner = gameState.players.find(pl => pl.id === p.staplePairId)
        if (partner) {
          stapledIds.add(p.id)
          stapledIds.add(partner.id)
          stapledPairs.push({
            id: `pairing_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            playerAId: p.isHawkInStaple ? p.id : partner.id,
            playerBId: p.isHawkInStaple ? partner.id : p.id,
            resolved: false,
            isStapled: true,
          })
        }
      }
    })

    // Shuffle remaining
    const unstapled = activePlayers.filter(p => !stapledIds.has(p.id))
    const shuffled = [...unstapled].sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      pairings.push({
        id: `pairing_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        playerAId: shuffled[i].id,
        playerBId: shuffled[i + 1].id,
        resolved: false,
      })
    }
    pairings = [...stapledPairs, ...pairings]
  } else {
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      pairings.push({
        id: `pairing_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        playerAId: shuffled[i].id,
        playerBId: shuffled[i + 1].id,
        resolved: false,
      })
    }
  }

  const round: Round = {
    number: gameState.roundNumber,
    pairings,
    resolved: false,
    week: gameState.week,
  }

  gameState.currentPairings = pairings
  gameState.rounds.push(round)
  return round
}

export function resolveRound(): Round {
  const round = gameState.rounds[gameState.rounds.length - 1]
  if (!round) throw new Error('No active round')

  round.pairings.forEach(pairing => {
    const playerA = gameState.players.find(p => p.id === pairing.playerAId)!
    const playerB = gameState.players.find(p => p.id === pairing.playerBId)!

    let choiceA: Choice
    let choiceB: Choice

    if (pairing.isStapled) {
      // In a stapled pair, A is always hawk, B is always dove
      choiceA = 'hawk'
      choiceB = 'dove'
    } else {
      choiceA = playerA.choice || 'dove'
      choiceB = playerB.choice || 'dove'
    }

    pairing.choiceA = choiceA
    pairing.choiceB = choiceB

    let deltaA = 0
    let deltaB = 0
    let summary = ''
    let diceRoll: number | undefined
    let coinFlip: 'heads' | 'tails' | undefined

    if (choiceA === 'dove' && choiceB === 'dove') {
      diceRoll = Math.floor(Math.random() * 20) + 1
      deltaA = diceRoll
      deltaB = diceRoll
      summary = `Both played DOVE. Each gains +${diceRoll} points (dice roll).`
    } else if (choiceA === 'hawk' && choiceB === 'dove') {
      const taken = Math.floor(playerB.points * 0.25)
      deltaB = -taken
      deltaA = taken * 3
      summary = `${playerA.name} (HAWK) takes 25% of ${playerB.name}'s points × 3. ${playerA.name} gains +${deltaA}, ${playerB.name} loses -${taken}.`
    } else if (choiceA === 'dove' && choiceB === 'hawk') {
      const taken = Math.floor(playerA.points * 0.25)
      deltaA = -taken
      deltaB = taken * 3
      summary = `${playerB.name} (HAWK) takes 25% of ${playerA.name}'s points × 3. ${playerB.name} gains +${deltaB}, ${playerA.name} loses -${taken}.`
    } else {
      // H-H: higher card number wins all
      if (playerA.cardNumber > playerB.cardNumber) {
        deltaA = playerB.points
        deltaB = -playerB.points
        summary = `Both played HAWK. ${playerA.name} has higher card (${playerA.cardNumber} vs ${playerB.cardNumber}) and takes all ${playerB.points} of ${playerB.name}'s points.`
      } else if (playerB.cardNumber > playerA.cardNumber) {
        deltaB = playerA.points
        deltaA = -playerA.points
        summary = `Both played HAWK. ${playerB.name} has higher card (${playerB.cardNumber} vs ${playerA.cardNumber}) and takes all ${playerA.points} of ${playerA.name}'s points.`
      } else {
        // Coin flip
        coinFlip = Math.random() > 0.5 ? 'heads' : 'tails'
        if (coinFlip === 'heads') {
          deltaA = playerB.points
          deltaB = -playerB.points
          summary = `Both played HAWK, cards tied (${playerA.cardNumber}). Coin flip → HEADS: ${playerA.name} takes all ${playerB.points} of ${playerB.name}'s points.`
        } else {
          deltaB = playerA.points
          deltaA = -playerA.points
          summary = `Both played HAWK, cards tied (${playerA.cardNumber}). Coin flip → TAILS: ${playerB.name} takes all ${playerA.points} of ${playerA.name}'s points.`
        }
      }
    }

    pairing.result = { playerAPointsDelta: deltaA, playerBPointsDelta: deltaB, summary, diceRoll, coinFlip }

    // Apply deltas
    playerA.points = Math.max(0, playerA.points + deltaA)
    playerB.points = Math.max(0, playerB.points + deltaB)

    // Update play history
    if (!pairing.isStapled) {
      // We'll track as red = hawk, black = dove conceptually
      playerA.playHistory.push(choiceA === 'hawk' ? 'red' : 'black')
      playerB.playHistory.push(choiceB === 'hawk' ? 'red' : 'black')
    }

    // Eliminate players at 0
    if (playerA.points <= 0) playerA.isEliminated = true
    if (playerB.points <= 0) playerB.isEliminated = true

    pairing.resolved = true
  })

  round.resolved = true
  gameState.phase = 'reveal'

  // Week 2: Check end conditions
  if (gameState.week === 2) {
    const active = gameState.players.filter(p => !p.isEliminated)
    const unstapled = active.filter(p => !p.staplePairId)
    if (unstapled.length <= 1) {
      gameState.phase = 'resolved'
    }
  }

  return round
}

export function offerStaple(dovePlayerId: string, acceptStaple: boolean): void {
  if (!acceptStaple) return

  // Find the pairing from last round where this player was the dove
  const lastRound = gameState.rounds[gameState.rounds.length - 1]
  if (!lastRound) return

  const pairing = lastRound.pairings.find(p => {
    if (p.resolved && !p.isStapled) {
      const wasHD = p.choiceA === 'hawk' && p.choiceB === 'dove' && p.playerBId === dovePlayerId
      const wasDH = p.choiceA === 'dove' && p.choiceB === 'hawk' && p.playerAId === dovePlayerId
      return wasHD || wasDH
    }
    return false
  })

  if (!pairing) return

  const dove = gameState.players.find(p => p.id === dovePlayerId)!
  const hawkId = pairing.choiceA === 'hawk' ? pairing.playerAId : pairing.playerBId
  const hawk = gameState.players.find(p => p.id === hawkId)!

  dove.staplePairId = hawk.id
  hawk.staplePairId = dove.id
  dove.isHawkInStaple = false
  hawk.isHawkInStaple = true
  dove.stapleRound = gameState.roundNumber
  hawk.stapleRound = gameState.roundNumber
}

export function setAdminMessage(msg: string): void {
  gameState.adminMessage = msg
}

export function setPhase(phase: GameState['phase']): void {
  gameState.phase = phase
}
