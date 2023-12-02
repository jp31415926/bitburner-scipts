/*
Method 	Description
ascendMember(memberName) 	Ascend a gang member.
canRecruitMember() 	Check if you can recruit a new gang member.
createGang(faction) 	Create a gang.
getAscensionResult(memberName) 	Get the result of an ascension without ascending.
getBonusTime() 	Get bonus time.
getChanceToWinClash(gangName) 	Get chance to win clash with other gang.
getEquipmentCost(equipName) 	Get cost of equipment.
getEquipmentNames() 	List equipment names.
getEquipmentStats(equipName) 	Get stats of an equipment.
getEquipmentType(equipName) 	Get type of an equipment.
getGangInformation() 	Get information about your gang.
getMemberInformation(name) 	Get information about a specific gang member.
getMemberNames() 	List all gang members.
getOtherGangInformation() 	Get information about the other gangs.
getTaskNames() 	List member task names.
getTaskStats(name) 	Get stats of a task.
inGang() 	Check if you're in a gang.
purchaseEquipment(memberName, equipName) 	Purchase an equipment for a gang member.
recruitMember(name) 	Recruit a new gang member.
setMemberTask(memberName, taskName) 	Set gang member to task.
setTerritoryWarfare(engage) 	Enable/Disable territory warfare.


GangGenInfo (returned by getGangInformation()):
Property 	Modifiers 	Type 	Description
faction 		string 	Name of faction that the gang belongs to ("Slum Snakes", etc.)
isHacking 		boolean 	Indicating whether or not it's a hacking gang
moneyGainRate 		number 	Money earned per game cycle
power 		number 	Gang's power for territory warfare
respect 		number 	Gang's respect
respectGainRate 		number 	Respect earned per game cycle
territory 		number 	Amount of territory held
territoryClashChance 		number 	Clash chance
territoryWarfareEngaged 		boolean 	Indicating if territory warfare is enabled
wantedLevel 		number 	Gang's wanted level
wantedLevelGainRate 		number 	Wanted level gained/lost per game cycle (negative for losses)
wantedPenalty 		number 	Number indicating the current wanted penalty

MemberInfo

Property 	Modifiers 	Type 	Description
agi_asc_mult 		number 	Agility multiplier from ascensions
agi_asc_points 		number 	Total earned agility experience
agi_exp 		number 	Current agility experience
agi_mult 		number 	Agility multiplier from equipment
agi 		number 	Agility skill level
augmentations 		string[] 	
cha_asc_mult 		number 	Charisma multiplier from ascensions
cha_asc_points 		number 	Total earned charisma experience
cha_exp 		number 	Current charisma experience
cha_mult 		number 	Charisma multiplier from equipment
cha 		number 	Charisma skill level
def_asc_mult 		number 	Defense multiplier from ascensions
def_asc_points 		number 	Total earned defense experience
def_exp 		number 	Current defense experience
def_mult 		number 	Defense multiplier from equipment
def 		number 	Defense skill level
dex_asc_mult 		number 	Dexterity multiplier from ascensions
dex_asc_points 		number 	Total earned dexterity experience
dex_exp 		number 	Current dexterity experience
dex_mult 		number 	Dexterity multiplier from equipment
dex 		number 	Dexterity skill level
earnedRespect 		number 	
hack_asc_mult 		number 	Hack multiplier from ascensions
hack_asc_points 		number 	Total earned hack experience
hack_exp 		number 	Current hack experience
hack_mult 		number 	Hack multiplier from equipment
hack 		number 	Hack skill level
moneyGain 		number 	
name 		string 	Name of the gang member
respectGain 		number 	
str_asc_mult 		number 	Strength multiplier from ascensions
str_asc_points 		number 	Total earned strength experience
str_exp 		number 	Current strength experience
str_mult 		number 	Strength multiplier from equipment
str 		number 	Strength skill level
task 		string 	Currently assigned task
upgrades 		string[] 	
wantedLevelGain 		number 	
*/


export async function main(ns) {
	ns.disableLog("sleep");
	ns.tail();

	//var info = ns.gang.getMemberInformation("thug1");
	//ns.print(`thug1 info = ${info.wantedPenalty}`);
	//ns.print(`getBonusTime() = ${ns.gang.getBonusTime()}`);
	//ns.print(`getEquipmentNames() = ${ns.gang.getEquipmentNames()}`);
	//var thugInfo = ns.gang.getMemberInformation("thug9");
	//ns.print(`thugInfo = agi=${thugInfo.agi}, def=${thugInfo.def}, dex=${thugInfo.dex}, str=${thugInfo.str}`);

	var thugTasks = [];
	var reducingWanted = false;
	// testing
	//for (let thug of ns.gang.getMemberNames()) {
	//  ns.gang.setMemberTask(thug, "Strongarm Civilians");
	//}

	while (true) {
		if (ns.gang.inGang()) {
			var equipment = [];
			for (let equip of ns.gang.getEquipmentNames()) {
				//ns.print(` ${equip} : ${ns.gang.getEquipmentType(equip)}`)
				equipment.push({ name: equip, cost: ns.gang.getEquipmentCost(equip), type: ns.gang.getEquipmentType(equip) });
			}
			equipment.sort((a, b) => a.cost - b.cost);
			//ns.print(`equipment: ${equipment["Baseball Bat"]}`)

			const gangInfo = ns.gang.getGangInformation();
			const gangMembers = ns.gang.getMemberNames();
			var money = ns.getPlayer().money;

			if (ns.gang.canRecruitMember()) {
				const thug = "thug" + (gangMembers.length + 1);
				ns.print(`Recruiting new gang member ${thug}, Train Combat`);
				ns.gang.recruitMember(thug);
				ns.gang.setMemberTask(thug, "Train Combat");
				continue;
			}

			for (let thug of gangMembers) {
				//ns.print(`checking ${thug}:`);
				const thugInfo = ns.gang.getMemberInformation(thug);
				const minLevel = Math.min(thugInfo.agi, thugInfo.def, thugInfo.dex, thugInfo.str);

				//ns.print(`${thug}: minLevel=${minLevel}`);
				if ((thugInfo.task == "Train Combat") && (minLevel > 100)) {
					//ns.print(`Gang member ${thug} tasked to Mug People`);
					ns.gang.setMemberTask(thug, "Mug People");
				}

				if (!reducingWanted && gangInfo.wantedLevel > 5.0 && (1.0 - gangInfo.wantedPenalty) * 100.0 > 0.10) {
					thugTasks = [];
					reducingWanted = true;
					//ns.print(`reducingWanted = true`);
					for (let thug of gangMembers) {
						const thugInfo = ns.gang.getMemberInformation(thug);
						if (thugInfo.task != "Vigilante Justice") {
							thugTasks[thug] = thugInfo.task;
							//ns.print(`thugTasks['${thug}']=${thugTasks[thug]}`)
							ns.gang.setMemberTask(thug, "Vigilante Justice");
						}
					}
				}

				if (reducingWanted && gangInfo.wantedLevel < 1.1) {
					reducingWanted = false;
					//ns.print(`reducingWanted = false`);
					for (let thug of gangMembers) {
						const thugInfo = ns.gang.getMemberInformation(thug);
						//ns.print(`thugInfo.task=${thugInfo.task}, thugTasks['${thug}']=${thugTasks[thug]}`)
						if (thugInfo.task == "Vigilante Justice") {
							if (thugTasks[thug]) {
								//ns.print(`thugTasks['${thug}']=${thugTasks[thug]}`)
								ns.gang.setMemberTask(thug, thugTasks[thug]);
								thugTasks[thug] = '';
							} else {
								ns.gang.setMemberTask(thug, "Mug People");
							}
						}
					}
				}
			}

			for (let equip of equipment) {
				if (equip.type == "Weapon" || equip.type == "Armor" || equip.type == "Vehicle" /*|| equip.type == "Rootkit"*/) {
					for (let thug of gangMembers) {
						const thugInfo = ns.gang.getMemberInformation(thug);
						//ns.print(` checking ${thug} equipment for ${equip.name} with cost ${equip.cost}`);
						if (thugInfo.upgrades.indexOf(equip.name) == -1 && equip.cost < money - 10000) {
							//ns.print(`Gang member ${thug} purchased ${equip.name}`);
							ns.gang.purchaseEquipment(thug, equip.name);
							money = ns.getPlayer().money;
						}
					}
				}
			}
		}
		await ns.sleep(1000);
	}
}
