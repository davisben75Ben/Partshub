(() => {
  const partInput = document.getElementById("part-number");
  const panel = partInput?.closest(".panel");
  if (!panel) return;

  const style = document.createElement("style");
  style.textContent = `
    .fitment-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
    .fitment-grid label{display:block;color:#b9c7d9;font-size:13px;margin-bottom:5px}
    .fitment-grid select{width:100%;font:inherit;padding:11px;border-radius:9px;border:1px solid #435773;background:#0e192b;color:white}
    .fitment-actions{display:flex;gap:10px;flex-wrap:wrap}
    .fitment-actions button{flex:1;min-width:180px}
    .fitment-status{font-size:13px;color:#cbd6e4;margin:10px 0}
    @media(max-width:540px){.fitment-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);

  const section = document.createElement("div");
  section.innerHTML = `
    <p class="hint">Catalog fitment check (select the exact catalog vehicle before checking):</p>
    <div class="fitment-grid">
      <div><label for="fit-country">Catalog country</label><select id="fit-country"><option value="">Loading countries…</option></select></div>
      <div><label for="fit-type">Vehicle type</label><select id="fit-type"><option value="1">Passenger vehicle</option><option value="2" selected>Commercial vehicle / truck</option></select></div>
      <div><label for="fit-make">Catalog make</label><select id="fit-make" disabled><option value="">Choose country and type</option></select></div>
      <div><label for="fit-model">Catalog model</label><select id="fit-model" disabled><option value="">Choose make</option></select></div>
      <div style="grid-column:1/-1"><label for="fit-vehicle">Exact vehicle / engine variant</label><select id="fit-vehicle" disabled><option value="">Choose model</option></select></div>
    </div>
    <div class="fitment-actions"><button id="fitment-check" type="button">Check part fitment</button></div>
    <p class="fitment-status" id="fitment-status" role="status">Loading the provider’s vehicle catalog…</p>`;
  const hint = panel.querySelector(".hint");
  hint ? hint.before(section) : panel.append(section);

  const $ = id => document.getElementById(id);
  const setOptions = (select, rows, placeholder) => {
    select.replaceChildren(new Option(placeholder, ""));
    rows.forEach(row => select.add(new Option(row.label, String(row.id))));
    select.disabled = rows.length === 0;
  };
  const textOf = obj => {
    if (typeof obj === "string" || typeof obj === "number") return String(obj);
    if (!obj || typeof obj !== "object") return "";
    for (const key of ["description","name","label","title","manufacturerName","modelName","typeName","vehicleName","displayName","vehicleTypeName"]) {
      if (obj[key] != null && String(obj[key]).trim()) return String(obj[key]).trim();
    }
    return "";
  };
  const idOf = obj => {
    if (!obj || typeof obj !== "object") return null;
    for (const key of ["countryFilterId","countryId","manufacturerId","manuId","modelId","vehicleId","vehicleTypeId","typeId","id","ID","Id"]) {
      const value = obj[key];
      if (value != null && /^\d+$/.test(String(value)) && Number(value) > 0) return Number(value);
    }
    return null;
  };
  const recordsOf = payload => {
    const root = payload?.data ?? payload;
    if (Array.isArray(root)) return root;
    if (!root || typeof root !== "object") return [];
    for (const key of ["countries","manufacturers","models","vehicles","vehicleTypes","items","results","result","data","list","records"]) {
      if (Array.isArray(root[key])) return root[key];
    }
    for (const value of Object.values(root)) if (Array.isArray(value)) return value;
    return [];
  };
  const getList = async (path, params={}) => {
    const query = new URLSearchParams(params);
    const res = await fetch(path + (query.size ? "?" + query : ""), {headers:{Accept:"application/json"}});
    const body = await res.json().catch(()=>({}));
    if (!res.ok || body.connected === false) throw new Error(body.error || "Catalog request failed ("+res.status+")");
    return recordsOf(body);
  };
  const mapRows = (items, kind) => items.map(obj => ({
    id:idOf(obj),
    label:textOf(obj) || JSON.stringify(obj)
  })).filter(row => row.id && row.label).filter((row,index,all)=>all.findIndex(other=>other.id===row.id)===index);

  const country = $("fit-country"), type = $("fit-type"), make = $("fit-make"), model = $("fit-model"), vehicle = $("fit-vehicle");
  const status = $("fitment-status");
  const resetBelow = (from) => {
    if (from <= 1) setOptions(make, [], "Choose country and type");
    if (from <= 2) setOptions(model, [], "Choose make");
    if (from <= 3) setOptions(vehicle, [], "Choose model");
  };

  async function loadCountries() {
    try {
      const rows = mapRows(await getList("/api/catalog/countries"), "country");
      setOptions(country, rows, rows.length ? "Select country" : "No countries returned");
      const preferred = rows.find(r => /united states|\busa\b|\bus\b/i.test(r.label));
      if (preferred) country.value = String(preferred.id);
      status.textContent = rows.length ? "Choose the catalog vehicle type and country, then select your exact vehicle." : "The provider returned no country list.";
    } catch (e) {
      setOptions(country, [], "Country catalog unavailable");
      status.textContent = "Could not load provider countries: " + e.message;
    }
  }
  async function loadMakes() {
    resetBelow(1);
    if (!country.value || !type.value) return;
    status.textContent = "Loading makes from the parts catalog…";
    try {
      const rows = mapRows(await getList("/api/catalog/manufacturers", {typeId:type.value}), "make");
      setOptions(make, rows, rows.length ? "Select make" : "No makes returned");
      const mazda = rows.find(r => /mazda/i.test(r.label));
      if (mazda) { make.value=String(mazda.id); await loadModels(); }
      else status.textContent = "Choose a make from the provider catalog.";
    } catch (e) { status.textContent = "Could not load catalog makes: " + e.message; }
  }
  async function loadModels() {
    resetBelow(2);
    if (!country.value || !type.value || !make.value) return;
    status.textContent = "Loading models from the parts catalog…";
    try {
      const rows = mapRows(await getList("/api/catalog/models", {typeId:type.value,manufacturerId:make.value,countryFilterId:country.value}), "model");
      setOptions(model, rows, rows.length ? "Select model" : "No models returned");
      const b3000 = rows.find(r => /B3000/i.test(r.label));
      if (b3000) { model.value=String(b3000.id); await loadVehicles(); }
      else status.textContent = "Choose a model from the provider catalog.";
    } catch (e) { status.textContent = "Could not load catalog models: " + e.message; }
  }
  async function loadVehicles() {
    resetBelow(3);
    if (!country.value || !type.value || !model.value) return;
    status.textContent = "Loading exact vehicle and engine variants…";
    try {
      const rows = mapRows(await getList("/api/catalog/vehicles", {typeId:type.value,modelId:model.value,countryFilterId:country.value}), "vehicle");
      setOptions(vehicle, rows, rows.length ? "Select exact vehicle / engine" : "No variants returned");
      status.textContent = rows.length ? "Select the year and engine variant matching your truck before checking fitment." : "The provider returned no vehicle variants for that model.";
    } catch (e) { status.textContent = "Could not load vehicle variants: " + e.message; }
  }
  country.addEventListener("change",loadMakes);
  type.addEventListener("change",loadMakes);
  make.addEventListener("change",loadModels);
  model.addEventListener("change",loadVehicles);

  function findIds(value, out=[]) {
    if (!value) return out;
    if (Array.isArray(value)) { value.forEach(v=>findIds(v,out)); return out; }
    if (typeof value !== "object") return out;
    const id = value.vehicleId ?? value.vehicleTypeId ?? value.id ?? value.ID ?? value.Id;
    if (id != null) out.push(String(id));
    Object.values(value).forEach(v=>{if(v&&typeof v==="object")findIds(v,out)});
    return out;
  }
  $("fitment-check").addEventListener("click", async () => {
    const partNumber = partInput.value.trim();
    if (!partNumber) { status.textContent="Enter a part number above first."; partInput.focus(); return; }
    if (!vehicle.value) { status.textContent="Select the exact catalog vehicle / engine variant first. Fitment cannot be confirmed from make and model alone."; return; }
    status.textContent="Checking this part against the selected catalog vehicle…";
    try {
      const rows = await getList("/api/catalog/compatible-vehicles", {
        typeId:type.value, articleNo:partNumber, countryFilterId:country.value
      });
      const compatible = findIds(rows).includes(String(vehicle.value));
      if (compatible) status.textContent="Catalog confirms this part fits the selected vehicle.";
      else if (rows.length) status.textContent="The catalog returned compatibility data, but did not confirm a match for this exact vehicle. Treat fitment as unconfirmed.";
      else status.textContent="The catalog returned no compatibility records. Fitment is unconfirmed, not a confirmed no-fit.";
    } catch (e) { status.textContent="Fitment check could not be completed: "+e.message; }
  });
  loadCountries();
})();