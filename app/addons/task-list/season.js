// Task List, the Season Missions: Season 1's weekly missions, from questlog.gg's achievements in the
// groups Group_Season_G1_L_<theme> (docs/SEASON.md). The game counts each one (an achievement
// counter, starting over at the weekly reset); a mission's goals are steps on that one count.
// A new season brings new ids: this list is then made again from questlog.gg.
;(function (root) {
  'use strict'

  const SEASON = 'Season 1'
  const MISSIONS = [
    { id: 230210900, theme: "Abyss", name: "Hometown of My Heart", what: "Spend 1 hours in Abyss", goals: [60] },
    { id: 230211000, theme: "Abyss", name: "Bare Minimum Morality", what: "Kill 5 opposing camp players", goals: [5, 10, 20] },
    { id: 230211100, theme: "Abyss", name: "Purify Reshanta", what: "Hunt 200 monsters in Abyss", goals: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000] },
    { id: 230211200, theme: "Abyss", name: "Watcher Kaira", what: "Defeat the boss Watcher Kaira 1 time", goals: [1, 5, 10] },
    { id: 230211300, theme: "Abyss", name: "Argo, the Spirit King", what: "Defeat the boss Argo, the Spirit King 1 time", goals: [1, 3] },
    { id: 230211400, theme: "Abyss", name: "Guardian Lord Nahma", what: "Defeat the boss Guardian Lord Nahma 1 time", goals: [1] },
    { id: 230211500, theme: "Abyss", name: "Land Grabs", what: "Participate in Artifact Siege 1 time by its end", goals: [1, 2] },
    { id: 230211600, theme: "Abyss", name: "Down to the Last One", what: "Win Artifact Siege 1 time", goals: [1] },
    { id: 230211700, theme: "Abyss", name: "Dominator of Lower Abyss", what: "Defeat 1 Dominator of Lower Abyss after Artifact Siege", goals: [1] },
    { id: 231210800, theme: "Arena", name: "Steady Efforts", what: "Participate in Arena 3 times", goals: [3, 7, 10] },
    { id: 231210900, theme: "Arena", name: "Me, Beyond Myself", what: "Win 1 time in Arena", goals: [1, 3, 5] },
    { id: 232210900, theme: "Transcendence", name: "Way of the Transcended", what: "Clear Transcendence Dungeon 3 times", goals: [3, 6, 10] },
    { id: 232211000, theme: "Transcendence", name: "Transforms Upon Death", what: "Clear Transcendence Dungeon 1 time without dying", goals: [1, 3] },
    { id: 232211100, theme: "Transcendence", name: "Transcendence Speed Run", what: "Clear Transcendence Dungeon within 15 minutes", goals: [1, 2] },
    { id: 232211200, theme: "Transcendence", name: "Time to Go Home", what: "Defeat 10 Mini-Bosses in Transcendence Dungeon", goals: [10] },
    { id: 232211300, theme: "Transcendence", name: "Toward Greater Power", what: "Extract 10 Arcana", goals: [1, 2] },
    { id: 233210700, theme: "Nightmare", name: "Friends With a Story", what: "Defeat Nightmare Boss 5 times", goals: [5, 10] },
    { id: 233210800, theme: "Nightmare", name: "Collecting Dream Shards", what: "Obtain 1,000 Phantasmal Fragments", goals: [1000, 3000] },
    { id: 233210900, theme: "Nightmare", name: "3 Minutes of Nightmare", what: "Defeat Nightmare Boss within 3 minutes", goals: [1] },
    { id: 233211000, theme: "Nightmare", name: "Nightmare Buster", what: "Defeat Nightmare Boss within 2 minutes", goals: [1] },
    { id: 233211100, theme: "Nightmare", name: "Eternal Rest", what: "Defeat Nightmare Boss within 1 minute", goals: [1] },
    { id: 234210800, theme: "Themes", name: "Hatched Bird", what: "Clear Ascension Trial 1 time", goals: [1, 2, 3] },
    { id: 234210900, theme: "Themes", name: "Shooting for the Stars", what: "Kill Asmodian [1-5 Star Officer] 2 times", goals: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
    { id: 234211000, theme: "Themes", name: "Baptism of Fire", what: "Kill Asmodian [First-Class to Ninth-Class Soldier] 6 times", goals: [6, 12, 18, 24, 30, 36, 42, 48, 54, 60] },
    { id: 234211100, theme: "Themes", name: "Pride of Elysea", what: "Kill 5 Asmodian players in Altgard", goals: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] },
    { id: 234211200, theme: "Themes", name: "Marching Beneath the Elyos Banner", what: "Kill 5 Asmodian players in Verteron", goals: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] },
    { id: 234211300, theme: "Themes", name: "Daeva of Enduring Deeds", what: "Gather 10 Odyle in Abyss", goals: [10, 20, 30] },
    { id: 234211400, theme: "Themes", name: "Daeva of Glorious Deeds", what: "Complete 3 Abyss commands", goals: [3, 6, 10] },
    { id: 234211500, theme: "Themes", name: "Daeva of Extraordinary Deeds", what: "Defeat 1 Abyss boss monster", goals: [1, 3, 5] },
    { id: 234211600, theme: "Themes", name: "Daeva's Book", what: "Participate in Battlefield 1 time", goals: [1, 2, 3] },
    { id: 239241400, theme: "Event", name: "[Event] Abyss", what: "Hunt 10 monsters in Abyss", goals: [10] },
    { id: 239241500, theme: "Event", name: "[Event] Transcendence", what: "Clear Transcendence Dungeon 1 time", goals: [1] },
    { id: 239241600, theme: "Event", name: "[Event] Expedition", what: "Clear Expedition Conquest 1 time", goals: [1] },
    { id: 239241700, theme: "Event", name: "[Event] Ascension Trial", what: "Clear Ascension Trial 1 time", goals: [1] },
    { id: 239241800, theme: "Event", name: "[Event] Nightmare", what: "Clear Nightmare (any level) 1 time", goals: [1] },
    { id: 239241900, theme: "Event", name: "[Event] Login", what: "Log in 3 times", goals: [3] },
    { id: 239242000, theme: "Event", name: "[Event] Obtain Gear", what: "Obtain 1 piece of Unique Gear", goals: [1] },
    { id: 239242100, theme: "Event", name: "[Event] Use Scrolls", what: "Use a Scroll 5 times", goals: [5] },
    { id: 239242200, theme: "Event", name: "[Event] Dimensional Invasion", what: "Participate in Dimensional Invasion 1 time", goals: [1] },
    { id: 239242300, theme: "Event", name: "[Event] Shugo Festival", what: "Participate in Shugo Festival 1 time", goals: [1] },
  ]
  const THEMES = ['Abyss', 'Arena', 'Nightmare', 'Transcendence', 'Themes', 'Event']

  if (typeof module === 'object' && module.exports) module.exports = { SEASON, MISSIONS, THEMES }
  else root.season = { SEASON, MISSIONS, THEMES }
})(this)
