
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
    try {
      const bienestar = document.querySelector('input[name="bienestar"]:checked')?.value;
      const seleccionados = [...document.querySelectorAll('#symptoms input:checked')].map(x => x.value);
      if (!bienestar) throw new Error('Seleccione su nivel de bienestar.');
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
          Bienestar: bienestar,
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
      $('formTrab').reset();
      $('otroWrap').classList.add('hidden');
      $('medWrap').classList.add('hidden');
    } catch (err) {
      setMessage('msgTrab', err.message, 'error');
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
    });
  });

  ['f','s'].forEach(p => {
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
    ['fEmpresa','sEmpresa'].forEach(id => {
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
        const bw = Math.max(2, (W - labelW - 70) * value / max);
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        let label = String(item.label || '');
        if (label.length > 30) label = label.slice(0,29) + '…';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(4, y - 1, labelW - 10, 24);
        ctx.fillStyle = '#081A3A';
        ctx.fillText(label, 10, y + 11);
        ctx.fillStyle = barColor;
        ctx.fillRect(labelW, y, bw, 22);
        ctx.fillStyle = textColor;
        ctx.font = 'bold 12px Arial';
        ctx.fillText(String(value), Math.min(labelW + bw + 8, W - 25), y + 11);
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
    const cols = ['Fecha','DNI','Nombres','Empresa','Bienestar','Condicion','Sintomas','ConsumioMedicamento','CondicionFinal'];
    el.innerHTML = '<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + cols.map(c => `<td>${escapeHtml(r[c] ?? '')}</td>`).join('') + '</tr>').join('') + '</tbody>';
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
      $('evalFecha').value = now.toISOString().slice(0,10);
      $('evalHora').value = now.toTimeString().slice(0,5);
      setMessage('evalMsg','');
    } catch (err) {
      setMessage('evalMsg', err.message, 'error');
    }
  });

  $('formEval').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const medicion = {
        DNI: evalWorker.DNI,
        Nombres: evalWorker.Nombres,
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
        EstadoEvaluacion: $('estadoEvaluacion').value,
        CondicionFinal: $('condicionFinal').value,
        ObservacionMedica: $('obsMedica').value,
        ReportId: evalWorker.ReportId,
        Sintomas: evalWorker.Sintomas,
        Bienestar: evalWorker.Bienestar,
        ConsumioMedicamento: evalWorker.ConsumioMedicamento,
        Medicamentos: evalWorker.Medicamentos
      };
      const data = await api('guardarMedicion', {medicion});
      setMessage('evalMsg', data.mensaje || 'Evaluación guardada correctamente.', 'ok');
    } catch (err) {
      setMessage('evalMsg', err.message, 'error');
    }
  });

  async function loadSeguimiento() {
    try {
      const data = await api('seguimiento', {
        empresa: $('sEmpresa').value,
        estadoEvaluacion: $('sEvaluacion').value,
        condicion: $('sCondicion').value,
        dni: $('sDni').value.trim(),
        ...filterDates('s')
      });
      fillCompanies(data.empresas);
      renderTable('tblSeg', data.registros || []);
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
