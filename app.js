
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const cfg = window.APP_CONFIG || {};
  const API = cfg.API_URL || '';
  let currentWorker = null;
  let evalWorker = null;

  async function api(action, payload = {}) {
    if (!API) throw new Error('No se ha configurado la URL de Apps Script.');
    const response = await fetch(API, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action, ...payload})
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Error del servidor.');
    return data;
  }

  function setMessage(id, text, type='') {
    const el = $(id);
    if (!el) return;
    el.className = 'message ' + type;
    el.textContent = text;
  }

  function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = $('view-' + name);
    if (target) target.classList.remove('hidden');
    const url = new URL(location.href);
    url.searchParams.set('view', name);
    history.replaceState({}, '', url);
  }

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  showView(new URLSearchParams(location.search).get('view') || 'trabajador');

  $('btnBuscarTrab').addEventListener('click', async () => {
    try {
      setMessage('buscarMsg', 'Buscando...');
      const dni = $('dniTrab').value.trim();
      if (!/^\d{8}$/.test(dni)) throw new Error('Ingrese un DNI válido de 8 dígitos.');
      const data = await api('buscarTrabajador', {dni});
      currentWorker = data.trabajador;
      $('datosTrab').innerHTML = `<b>${escapeHtml(currentWorker.Nombres)}</b><small>${escapeHtml(currentWorker.Cargo)} · ${escapeHtml(currentWorker.Empresa)}</small>`;
      $('datosTrab').classList.remove('hidden');
      $('formTrab').classList.remove('hidden');
      setMessage('buscarMsg', '');
    } catch (err) {
      setMessage('buscarMsg', err.message, 'error');
    }
  });

  $('chkOtro').addEventListener('change', e => {
    $('otroWrap').classList.toggle('hidden', !e.target.checked);
    if (e.target.checked) {
      $('chkNinguno').checked = false;
      setTimeout(() => $('otroSintoma').focus(), 50);
    } else {
      $('otroSintoma').value = '';
    }
  });

  $('chkNinguno').addEventListener('change', e => {
    if (e.target.checked) {
      document.querySelectorAll('#symptoms input:not(#chkNinguno)').forEach(x => x.checked = false);
      $('otroWrap').classList.add('hidden');
      $('otroSintoma').value = '';
    }
  });

  document.querySelectorAll('#symptoms input:not(#chkNinguno)').forEach(x => {
    x.addEventListener('change', () => {
      if (x.checked) $('chkNinguno').checked = false;
    });
  });

  document.querySelectorAll('input[name="medicamento"]').forEach(r => {
    r.addEventListener('change', () => {
      const si = document.querySelector('input[name="medicamento"]:checked')?.value === 'SI';
      $('medWrap').classList.toggle('hidden', !si);
      if (!si) $('medicamentos').value = '';
      if (si) setTimeout(() => $('medicamentos').focus(), 50);
    });
  });

  $('formTrab').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.submitter || $('formTrab').querySelector('button[type="submit"]');
    if (submitBtn?.disabled) return;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Registrando...';
    }
    try {
const seleccionados = [...document.querySelectorAll('#symptoms input:checked')].map(x => x.value);
      if (!seleccionados.length) throw new Error('Seleccione una opción en Estado de salud.');
      if (seleccionados.includes('Otro síntoma') && !$('otroSintoma').value.trim()) throw new Error('Especifique el otro síntoma.');
      const consumio = document.querySelector('input[name="medicamento"]:checked')?.value;
      if (!consumio) throw new Error('Indique si consumió medicamentos.');
      if (consumio === 'SI' && !$('medicamentos').value.trim()) throw new Error('Especifique el medicamento consumido.');
      const altura = document.querySelector('input[name="altura"]:checked')?.value;
      if (!altura) throw new Error('Indique si realizará trabajos a más de 7 metros.');
      const alcohol = document.querySelector('input[name="alcohol"]:checked')?.value;
      const marihuana = document.querySelector('input[name="marihuana"]:checked')?.value;
      if (!alcohol) throw new Error('Indique si consumió alcohol en las últimas 12 horas.');
      if (!marihuana) throw new Error('Indique si consumió marihuana en las últimas 24 horas.');
      if (!$('declaracion').checked) throw new Error('Debe aceptar la declaración de veracidad.');

      setMessage('msgTrab', 'Enviando registro...');
      const data = await api('guardarReporte', {
        reporte: {
          ...currentWorker,
Sintomas: seleccionados,
          OtroSintoma: $('otroSintoma').value.trim(),
          ConsumioMedicamento: consumio,
          Medicamentos: $('medicamentos').value.trim(),
          TrabajosMayores7m: altura,
          ConsumoAlcohol12h: alcohol,
          ConsumoMarihuana24h: marihuana,
          Declaracion: 'SI'
        }
      });
      setMessage('msgTrab', data.mensaje || 'Registro guardado correctamente.', 'ok');
      const tieneSintomas = seleccionados.some(s => s !== 'No tengo ningún síntoma');
      const requiereEvaluacion = tieneSintomas || consumio === 'SI' || alcohol === 'SI' || marihuana === 'SI';

      if (requiereEvaluacion) {
        alert(
          'Registro generado correctamente.\n\n' +
          'Su declaración requiere evaluación preventiva. Informe a su supervisor inmediato y al personal de salud antes de iniciar o continuar trabajos críticos.'
        );
      } else {
        alert(
          'Registro generado correctamente.\n\n' +
          'No se reportaron condiciones que requieran evaluación médica. Su condición queda registrada como APTO. ' +
          'Si durante la jornada presenta algún síntoma o malestar, informe inmediatamente a su supervisor y al personal de salud.'
        );
      }

      $('formTrab').reset();
      $('otroWrap').classList.add('hidden');
      $('medWrap').classList.add('hidden');
      $('formTrab').classList.add('hidden');
      $('datosTrab').classList.add('hidden');
      $('dniTrab').value = '';
      currentWorker = null;
      if (submitBtn) submitBtn.textContent = submitBtn.dataset.originalText || 'Enviar registro';
    } catch (err) {
      setMessage('msgTrab', err.message, 'error');
      if (String(err.message || '').includes('Ya existe un registro de salud para este DNI')) {
        alert(err.message);
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || 'Enviar registro';
      }
    }
  });

  $('btnLogin').addEventListener('click', () => {
    if ($('adminPin').value === (cfg.ADMIN_PIN || '2026ENGIE')) {
      $('loginAdmin').classList.add('hidden');
      $('adminPanel').classList.remove('hidden');
      loadDashboard();
    } else {
      setMessage('loginMsg', 'Código incorrecto.', 'error');
    }
  });

  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab').forEach(x => x.classList.add('hidden'));
      $('tab-' + btn.dataset.tab).classList.remove('hidden');
      if (btn.dataset.tab === 'seguimiento') loadSeguimiento();
      if (btn.dataset.tab === 'dashboardmedico') loadMedicalDashboard();
    });
  });

  ['f','m','s'].forEach(p => {
    $(p+'FechaTipo').addEventListener('change', () => {
      const value = $(p+'FechaTipo').value;
      $(p+'Fecha').classList.toggle('hidden', value !== 'dia');
      $(p+'Mes').classList.toggle('hidden', value !== 'mes');
    });
  });

  function filterDates(prefix) {
    const type = $(prefix+'FechaTipo').value;
    return {
      fecha: type === 'dia' ? $(prefix+'Fecha').value : '',
      mes: type === 'mes' ? $(prefix+'Mes').value : ''
    };
  }

  function fillCompanies(companies=[]) {
    ['fEmpresa','mEmpresa','sEmpresa'].forEach(id => {
      const el = $(id);
      const old = el.value;
      el.innerHTML = '<option value="">Todas las empresas</option>' + companies.map(x => `<option>${escapeHtml(x)}</option>`).join('');
      el.value = old;
    });
  }

  async function loadDashboard() {
    try {
      const data = await api('dashboard', {
        empresa: $('fEmpresa').value,
        estado: $('fEstado').value,
        dni: $('fDni').value.trim(),
        ...filterDates('f')
      });
      fillCompanies(data.empresas);
      renderKpis(data.kpis || {});
      drawBar('chartEmpresa', data.cumplimiento || [], 'porcentaje', '%');
      drawBar('chartEstado', data.estados || [], 'cantidad', '');
      drawBar('chartSintomas', data.sintomas || [], 'cantidad', '');
      renderTable('tblDash', data.registros || []);
    } catch (err) {
      alert(err.message);
    }
  }

  $('btnFiltrarDash').addEventListener('click', loadDashboard);
  $('btnPdfDash').addEventListener('click', () => window.print());

  function renderKpis(k) {
    const items = [
      ['Trabajadores activos', k.activos],
      ['Reportes', k.reportes],
      ['Cumplimiento', (k.cumplimiento || 0) + '%'],
      ['Con síntomas', k.conSintomas],
      ['Evaluados', k.evaluados],
      ['No aptos', k.noAptos]
    ];
    $('kpis').innerHTML = items.map(x => `<div class="kpi"><span>${x[0]}</span><b>${x[1] ?? 0}</b></div>`).join('');
  }

  function drawBar(id, data, key, suffix) {
    const canvas = $(id);
    const ratio = window.devicePixelRatio || 1;
    const bodyColor = getComputedStyle(document.body).color;
    const textColor = bodyColor || '#102047';
    const mutedColor = textColor;
    const barColor = '#00B8F0';

    if (id === 'chartSintomas') {
      const rowH = 42;
      const cssHeight = Math.max(300, data.length * rowH + 50);
      canvas.style.height = cssHeight + 'px';
      canvas.width = canvas.clientWidth * ratio;
      canvas.height = cssHeight * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      const W = canvas.clientWidth;
      ctx.clearRect(0, 0, W, cssHeight);
      if (!data.length) {
        ctx.fillStyle = mutedColor;
        ctx.font = '14px Arial';
        ctx.fillText('Sin datos', 20, 30);
        return;
      }
      const max = Math.max(...data.map(x => Number(x[key]) || 0), 1);
      const labelW = Math.min(220, Math.max(130, W * 0.36));
      ctx.textBaseline = 'middle';
      data.forEach((item, i) => {
        const value = Number(item[key]) || 0;
        const y = 24 + i * rowH;
        // Ancho mínimo para que incluso el valor 1 sea claramente visible.
        const calculatedWidth = (W - labelW - 45) * value / max;
        const bw = Math.max(48, calculatedWidth);

        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        let label = String(item.label || '');
        if (label.length > 30) label = label.slice(0,29) + '…';

        // Etiqueta del síntoma.
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(4, y - 1, labelW - 10, 24);
        ctx.fillStyle = '#081A3A';
        ctx.fillText(label, 10, y + 11);

        // Barra celeste de alto contraste.
        ctx.fillStyle = '#00B8F0';
        ctx.fillRect(labelW, y, Math.min(bw, W - labelW - 8), 24);

        // Cantidad dentro de la barra, en blanco y tamaño mayor.
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        const visibleBarWidth = Math.min(bw, W - labelW - 8);
        ctx.fillText(String(value), labelW + visibleBarWidth / 2, y + 13);
        ctx.textAlign = 'left';
      });
      return;
    }

    const cssHeight = 300;
    canvas.style.height = cssHeight + 'px';
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = cssHeight * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const W = canvas.clientWidth, H = cssHeight;
    ctx.clearRect(0, 0, W, H);
    if (!data.length) {
      ctx.fillStyle = mutedColor;
      ctx.font = '14px Arial';
      ctx.fillText('Sin datos', 20, 30);
      return;
    }
    const max = Math.max(...data.map(x => Number(x[key]) || 0), 1);
    const gap = Math.max(12, Math.min(24, W / (data.length * 4)));
    const bw = Math.max(22, (W - 70) / data.length - gap);
    ctx.textAlign = 'center';
    data.forEach((item, i) => {
      const value = Number(item[key]) || 0;
      const height = (H - 95) * value / max;
      const left = 40 + i * (bw + gap);
      ctx.fillStyle = barColor;
      ctx.fillRect(left, H - 52 - height, bw, height);
      const valueText = value + suffix;
      ctx.font = 'bold 12px Arial';
      const valueWidth = ctx.measureText(valueText).width + 10;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(left + bw/2 - valueWidth/2, H - 73 - height, valueWidth, 18);
      ctx.fillStyle = '#081A3A';
      ctx.fillText(valueText, left + bw/2, H - 60 - height);
      ctx.font = '10px Arial';
      const words = String(item.label || '').split(' ');
      let lines = [], line = '';
      words.forEach(word => {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > bw + 18 && line) {
          lines.push(line); line = word;
        } else line = test;
      });
      if (line) lines.push(line);
      lines.slice(0,2).forEach((txt, idx) => {
        const y = H - 30 + idx*12;
        const tw = ctx.measureText(txt).width + 6;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(left + bw/2 - tw/2, y - 9, tw, 11);
        ctx.fillStyle = '#081A3A';
        ctx.fillText(txt, left + bw/2, y);
      });
    });
  }

  function renderTable(id, rows) {
    const el = $(id);
    if (!rows.length) {
      el.innerHTML = '<tr><td>Sin registros</td></tr>';
      return;
    }
    const cols = ['Fecha','DNI','Nombres','Cargo','Empresa','Condicion','Sintomas','ConsumioMedicamento','ConsumoAlcohol12h','ConsumoMarihuana24h','CondicionFinal'];
    el.innerHTML = '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + cols.map(c => `<td>${escapeHtml(r[c] ?? '')}</td>`).join('') + '</tr>').join('') + '</tbody>';
  }

  function normalizarFechaParaInput(valor) {
    if (!valor) return '';

    const texto = String(valor).trim();

    // Formato ISO o similar: 2026-07-30
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    // Formato peruano: 30/07/2026 o 30/07/2026 23:34
    const peru = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (peru) {
      const dia = peru[1].padStart(2, '0');
      const mes = peru[2].padStart(2, '0');
      return `${peru[3]}-${mes}-${dia}`;
    }

    // Último intento con Date, corrigiendo desfases de zona horaria
    const fecha = new Date(valor);
    if (!Number.isNaN(fecha.getTime())) {
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    }

    return '';
  }

  $('btnBuscarEval').addEventListener('click', async () => {
    try {
      const dni = $('evalDni').value.trim();
      const data = await api('buscarUltimoReporte', {dni});
      evalWorker = data.reporte;
      $('evalWorker').innerHTML = `<b>${escapeHtml(evalWorker.Nombres)}</b><small>${escapeHtml(evalWorker.Empresa)} · Síntomas: ${escapeHtml(evalWorker.Sintomas || 'No registrado')}</small>`;
      $('evalWorker').classList.remove('hidden');
      $('formEval').classList.remove('hidden');
      const now = new Date();
      const fechaReporte = normalizarFechaParaInput(evalWorker.Fecha);
      $('evalFecha').value = fechaReporte || normalizarFechaParaInput(now);
      $('evalHora').value = now.toTimeString().slice(0,5);
      setMessage('evalMsg','');
    } catch (err) {
      setMessage('evalMsg', err.message, 'error');
      alert('No hay reporte registrado para este DNI. El trabajador debe completar primero su registro preventivo de salud.');
      $('evalWorker').classList.add('hidden');
      $('formEval').classList.add('hidden');
    }
  });


  $('condicionFinal').addEventListener('change', () => {
    const noApto = $('condicionFinal').value === 'NO APTO';
    $('obsMedicaWrap').classList.toggle('hidden', !noApto);
    $('obsMedica').required = noApto;
    if (!noApto) $('obsMedica').value = '';
  });

  $('formEval').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.submitter || $('formEval').querySelector('button[type="submit"]');
    if (submitBtn?.disabled) return;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Finalizando...';
    }
    try {
      if ($('condicionFinal').value === 'NO APTO' && !$('obsMedica').value.trim()) {
        throw new Error('Debe registrar la observación médica que sustenta la condición NO APTO.');
      }
      const medicion = {
        DNI: evalWorker.DNI,
        Nombres: evalWorker.Nombres,
        Cargo: evalWorker.Cargo,
        Empresa: evalWorker.Empresa,
        Correo: evalWorker.Correo,
        Fecha: $('evalFecha').value,
        Hora: $('evalHora').value,
        PresionArterial: $('paSis').value + '/' + $('paDia').value,
        FrecuenciaCardiaca: $('fc').value,
        FrecuenciaRespiratoria: $('fr').value,
        Temperatura: $('temp').value,
        Saturacion: $('spo2').value,
        RangoNormal: $('rangoNormal').value,
CondicionFinal: $('condicionFinal').value,
        ObservacionMedica: $('obsMedica').value,
        ReportId: evalWorker.ReportId,
        Sintomas: evalWorker.Sintomas,
        Bienestar: evalWorker.Bienestar,
        ConsumioMedicamento: evalWorker.ConsumioMedicamento,
        Medicamentos: evalWorker.Medicamentos,
        ConsumoAlcohol12h: evalWorker.ConsumoAlcohol12h,
        ConsumoMarihuana24h: evalWorker.ConsumoMarihuana24h
      };
      const data = await api('guardarMedicion', {medicion});
      setMessage('evalMsg', data.mensaje || 'Evaluación guardada correctamente.', 'ok');
      alert('Evaluación médica finalizada correctamente.');
      $('formEval').classList.add('hidden');
      $('evalWorker').classList.add('hidden');
      $('evalDni').value = '';
      evalWorker = null;
      if (submitBtn) submitBtn.textContent = submitBtn.dataset.originalText || 'Finalizar evaluación médica';
    } catch (err) {
      setMessage('evalMsg', err.message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || 'Finalizar evaluación médica';
      }
    }
  });


  function renderTrackingTable(rows) {
    const el = $('tblSeg');
    const cols = [
      ['Fecha','Fecha'],['Hora','Hora'],['DNI','DNI'],['Nombres','Nombres'],['Cargo','Cargo'],['Empresa','Empresa'],
      ['Sintomas','Síntomas'],['ConsumioMedicamento','Medicamentos'],['ConsumoAlcohol12h','Alcohol 12 h'],
      ['ConsumoMarihuana24h','Marihuana 24 h'],['CondicionFinal','Condición Final']
    ];
    if (!rows.length) {
      el.innerHTML = '<tr><td>Sin registros</td></tr>';
      return;
    }
    el.innerHTML = '<thead><tr>' + cols.map(c => `<th>${c[1]}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + cols.map(c => `<td>${escapeHtml(r[c[0]] ?? '')}</td>`).join('') + '</tr>').join('') + '</tbody>';
  }

  function renderMedicalTable(rows) {
    const el = $('tblMed');
    const cols = [
      ['Fecha','Fecha'],['Hora','Hora'],['DNI','DNI'],['Nombres','Nombres'],['Cargo','Cargo'],['Empresa','Empresa'],
      ['PresionArterial','PA (mmHG)'],['FrecuenciaCardiaca','F.C. (x min.)'],
      ['FrecuenciaRespiratoria','F.R. (x min.)'],['Temperatura','T° (C°)'],
      ['Saturacion','Sat. O2 (%)'],['RangoNormal','Rango normal'],
      ['CondicionFinal','Condición Final'],['ObservacionMedica','Observación médica']
    ];
    if (!rows.length) {
      el.innerHTML = '<tr><td>Sin evaluaciones médicas</td></tr>';
      return;
    }
    el.innerHTML = '<thead><tr>' + cols.map(c => `<th>${c[1]}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + cols.map(c => `<td>${escapeHtml(r[c[0]] ?? '')}</td>`).join('') + '</tr>').join('') + '</tbody>';
  }

  function renderMedicalKpis(k) {
    const items = [
      ['Evaluaciones médicas', k.total || 0],
      ['Aptos', k.aptos || 0],
      ['No aptos', k.noAptos || 0]
    ];
    $('kpisMed').innerHTML = items.map(x => `<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  }

  async function loadMedicalDashboard() {
    try {
      const data = await api('dashboardMedico', {
        empresa: $('mEmpresa').value,
        condicion: $('mCondicion').value,
        dni: $('mDni').value.trim(),
        ...filterDates('m')
      });
      fillCompanies(data.empresas || []);
      renderMedicalKpis(data.kpis || {});
      renderMedicalTable(data.registros || []);
    } catch (err) {
      alert(err.message);
    }
  }

  $('btnFiltrarMed').addEventListener('click', loadMedicalDashboard);

  $('btnPdfMed').addEventListener('click', async () => {
    const btn = $('btnPdfMed');
    if (btn.disabled) return;
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'Generando PDF...';
    try {
      const data = await api('pdfEvaluaciones', {
        empresa: $('mEmpresa').value,
        condicion: $('mCondicion').value,
        dni: $('mDni').value.trim(),
        ...filterDates('m')
      });
      const binary = atob(data.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {type:'application/pdf'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || 'Resumen_Evaluaciones_Medicas.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });

  async function loadSeguimiento() {
    try {
      const data = await api('seguimiento', {
        empresa: $('sEmpresa').value,
        condicion: $('sCondicion').value,
        dni: $('sDni').value.trim(),
        ...filterDates('s')
      });
      fillCompanies(data.empresas);
      renderTrackingTable(data.registros || []);
    } catch (err) {
      alert(err.message);
    }
  }

  $('btnFiltrarSeg').addEventListener('click', loadSeguimiento);
$('btnConsulta').addEventListener('click', async () => {
    try {
      const dni = $('consultaDni').value.trim();
      if (!/^\d{8}$/.test(dni)) throw new Error('Ingrese un DNI válido de 8 dígitos.');
      const data = await api('consulta', {dni});
      const r = data.resultado || {};
      const c = r.CondicionFinal || 'PENDIENTE';
      const cls = c === 'APTO' ? 'apto' : c === 'NO APTO' ? 'no-apto' : 'observado';
      const motivo = r.ObservacionMedica || (
        c === 'NO APTO'
          ? 'La condición fue determinada por el personal de salud según la evaluación realizada.'
          : c === 'OBSERVADO'
            ? 'El trabajador requiere seguimiento o una evaluación complementaria.'
            : 'No se registraron restricciones en la última evaluación.'
      );
      $('consultaResultado').innerHTML = `
        <div class="consulta-summary">
          <div class="status ${cls}">${escapeHtml(c)}</div>
          <div class="meta">
            <div><b>Última condición registrada</b><br>${escapeHtml(c)}</div>
            <div><b>Trabajador</b><br>${escapeHtml(r.Nombres || '')}</div>
            <div><b>Fecha</b><br>${escapeHtml(r.Fecha || 'No registrada')}</div>
            <div><b>Hora</b><br>${escapeHtml(r.Hora || 'No registrada')}</div>
          </div>
          <div class="reason"><b>Motivo / observación:</b><br>${escapeHtml(motivo)}</div>
          <div class="note">Resultado de la última evaluación realizada por el personal de salud.</div>
        </div>`;
    } catch (err) {
      $('consultaResultado').innerHTML = `<div class="message error">${escapeHtml(err.message)}</div>`;
    }
  });

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }
});
