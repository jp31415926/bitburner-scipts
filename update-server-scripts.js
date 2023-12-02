// update-server-scripts.js
const script_name = "early-hack-template.js";
let script_size = 0;

export async function main(ns) {
  script_size = ns.getScriptRam(script_name);

  // Iterator we'll use for our loop
  let i = 0;

  // Continuously try to purchase servers until we've reached the maximum
  // amount of servers
  while (i < ns.getPurchasedServerLimit()) {
    let hostname = "pserv-" + i;
    replace_script(ns, hostname);
    ++i;
  }

  replace_script(ns, "n00dles");
  replace_script(ns, "CSEC");
  replace_script(ns, "foodnstuff");
  replace_script(ns, "joesguns");
  replace_script(ns, "hong-fang-tea");
  replace_script(ns, "nectar-net");
  replace_script(ns, "harakiri-sushi");
  replace_script(ns, "sigma-cosmetics");
  replace_script(ns, "max-hardware");
  replace_script(ns, "neo-net");
  replace_script(ns, "zer0");
  replace_script(ns, "iron-gym");
  replace_script(ns, "phantasy");
  replace_script(ns, "avmnite-02h");
  replace_script(ns, "omega-net");
  replace_script(ns, "silver-helix");
}

function replace_script(ns, hostname) {
  const ram = ns.getServerMaxRam(hostname);
  ns.kill(script_name, hostname);
  ns.scp(script_name, hostname);
  ns.exec(script_name, hostname, Math.trunc(ram / script_size));
}
