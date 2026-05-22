# Reference Data

This file contains reference tables for PowerPlay powers, PowerPlay states, and Background Simulation (BGS) states used by Elite Dangerous. These tables serve as source material for the multilingual fuzzy-search dictionaries planned for future Ocellus versions.

---

## PowerPlay Powers

Elite Dangerous has 12 Powers, each aligned to one of the three superpowers or independent, with a home system (headquarters) and a leader.

| Power                | Superpower  | Headquarters / Capital | Leader                             |
| -------------------- | ----------- | ---------------------- | ---------------------------------- |
| Aisling Duval        | Empire      | Cubeo                  | Princess Aisling Duval             |
| Arissa Lavigny-Duval | Empire      | Kamadhenu              | Emperor Arissa Lavigny-Duval       |
| Denton Patreus       | Empire      | Eotienses              | Senator Denton Patreus             |
| Yuri Grom            | Independent | LHS 215                | Yuri Grom                          |
| Zemina Torval        | Empire      | Synteini               | Senator Zemina Torval              |
| Archon Delaine       | Independent | Harma                  | Pirate King Archon Delaine         |
| Edmund Mahon         | Alliance    | Gateway                | Prime Minister Edmund Mahon        |
| Felicia Winters      | Federation  | Rhea                   | President Felicia Winters          |
| Jerome Archer        | Federation  | Nanomam                | Shadow President Jerome Archer     |
| Li Yong-Rui          | Independent | Lembava                | CEO Li Yong-Rui                    |
| Nakato Kaine         | Alliance    | Tionisla               | Shadow Prime Minister Nakato Kaine |
| Pranav Antal         | Independent | Midgard                | Guru Pranav Antal                  |

---

## PowerPlay States

Systems under a Power's influence can be in one of the following states.

| State         | Description                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `None`        | System is not under any Power influence.                                              |
| `Fortified`   | Power's presence is strongly reinforced; harder for rivals to flip.                   |
| `Stronghold`  | Maximum reinforcement; acts as a permanent stronghold for the Power.                  |
| `Acquired`    | Recently taken over by a Power; in the process of being consolidated.                 |
| `Contested`   | Actively fought over between two or more Powers.                                      |
| `Expansion`   | Power is expanding into this system from an adjacent controlled system.               |
| `Exploited`   | Within the exploitation range of a controlled system but not directly controlled.     |
| `Control`     | Directly controlled by the Power (Powerplay 2.0 replaces old "Controlled" with this). |
| `Preparation` | Being prepared for expansion (legacy state, less common in Powerplay 2.0).            |
| `Undermined`  | Rival Power has successfully undermined influence here.                               |
| `Unoccupied`  | Not claimed or influenced by any Power.                                               |

---

## BGS States

As a result of the background simulation, any populated system can have any of these states. The "Incompatible with" column lists states that cannot coexist with the given state for the same faction in the same system.

| State                            | Description                                                                                          | Incompatible with       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| `None`                           | Default state; no active effects.                                                                    | —                       |
| `Boom`                           | Increased trade profits, more passenger missions, higher ship/module availability.                   | `Bust`                  |
| `Bust`                           | Reduced trade profits, fewer missions available.                                                     | `Boom`                  |
| `Civil Liberty`                  | Increased security, fewer illegal missions and black market opportunities.                           | `Lockdown`              |
| `Civil Unrest`                   | Reduced security, increased illegal mission availability.                                            | —                       |
| `Lockdown`                       | Security increased, black market disabled, fines/bounties increase.                                  | `Civil Liberty`         |
| `Outbreak`                       | Increased demand for medicines, reduced supply of certain goods, fewer combat missions.              | —                       |
| `Famine`                         | Increased demand for food, lower influence gains from trade.                                         | —                       |
| `Drought`                        | Increased demand for water and food resources.                                                       | —                       |
| `Infrastructure Failure`         | Reduced station services, increased demand for repair commodities (Polymers, CMM Composite, etc).    | —                       |
| `Natural Disaster`               | Increased demand for rescue commodities (Basic Medicines, Evacuation Shelters, etc).                 | —                       |
| `Terrorist Attack` / `Terrorism` | Station services disrupted, increased demand for combat stabilisers and rescue items.                | —                       |
| `Blight`                         | Reduced crop yields, increased demand for agrichemicals and pest-control goods.                      | —                       |
| `War`                            | Conflict between two factions in the same system; combat missions available; station repairs halted. | `Civil War`, `Election` |
| `Civil War`                      | Conflict between two factions for system control; combat missions available.                         | `War`, `Election`       |
| `Election`                       | Non-violent conflict between two factions for influence control.                                     | `War`, `Civil War`      |
| `Expansion`                      | Faction preparing to expand into a neighbouring system; increases influence.                         | `Retreat`               |
| `Retreat`                        | Faction losing influence and at risk of leaving the system; reduces influence further.               | `Expansion`             |
| `Investment`                     | Increased system development; higher ship/module variety and availability.                           | —                       |
| `Pirate Attack`                  | Increased pirate activity; trade routes disrupted; demand for security and weapons.                  | —                       |
| `Under Repairs` / `Repair`       | Station undergoing repairs after a conflict; limited services.                                       | —                       |
