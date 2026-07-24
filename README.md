# Control Preventivo de Salud ENGIE

Proyecto con dos accesos en una sola interfaz:

- **Trabajador:** `?view=trabajador`
- **Administrador / personal médico:** `?view=admin`
- **Consulta individual:** `?view=consulta`

## 1. Preparar Google Sheets

El backend usa el archivo:

`1jMxj6VXEDK_P_Wb3MQQty4g_tkf4zfKS9ucgnCR71fQ`

Pestañas previstas:

- `trabajadores`: DNI, Nombres, Cargo, Empresa, Edad, Correo, Celular, Estado
- `Empresas`: Empresa, CorreoDoctor
- `Reportes`: registro inicial del trabajador
- `Mediciones`: funciones vitales y condición final

No cambies los encabezados. La función `setupEngieSalud()` crea las pestañas faltantes y sus encabezados.

## 2. Instalar Apps Script

1. Abre la hoja de cálculo.
2. Ve a **Extensiones > Apps Script**.
3. Borra el contenido existente y pega `apps-script/Code.gs`.
4. Cambia `ADMIN_PIN`.
5. Ejecuta manualmente `setupEngieSalud()` y autoriza.
6. Ve a **Implementar > Nueva implementación > Aplicación web**.
7. Ejecutar como: **Yo**.
8. Acceso: **Cualquier persona**.
9. Copia la URL terminada en `/exec`.

## 3. Conectar la página

Abre `config.js` y reemplaza:

```js
API_URL: "PEGAR_AQUI_URL_DE_APPS_SCRIPT"
```

por la URL de Apps Script.

## 4. Publicar en GitHub Pages

Sube todos los archivos de esta carpeta a un repositorio, por ejemplo:

`App-salud-Engie`

En **Settings > Pages**, selecciona la rama `main` y carpeta `/root`.

Los accesos quedarían así:

- `https://TU_USUARIO.github.io/App-salud-Engie/?view=trabajador`
- `https://TU_USUARIO.github.io/App-salud-Engie/?view=admin`
- `https://TU_USUARIO.github.io/App-salud-Engie/?view=consulta`

## 5. Lógica implementada

- Búsqueda automática por DNI.
- Selección múltiple de síntomas, incluida “No tengo ningún síntoma”.
- Declaración de trabajo en altura mayor a 7 m.
- Alerta al correo médico de la empresa cuando hay síntomas.
- PDF al trabajador; con síntomas también al médico.
- Registro posterior de presión arterial, FC, FR, temperatura, SpO₂, hora, rango normal y condición.
- Consulta de APTO / NO APTO / PENDIENTE por DNI.
- Dashboard con cumplimiento, alertas, pendientes, gráficos y seguimiento.
- Exportación del dashboard a PDF.

## Observaciones importantes

- El PIN del administrador en el navegador es una protección básica. Para producción corporativa conviene restringir el Apps Script a cuentas autorizadas o implementar autenticación institucional.
- Los rangos clínicos no se calculan automáticamente: la médica marca “Sí/No” según su evaluación profesional, tal como se solicitó.
- La pestaña `Estado` del padrón debe usar `ACTIVO` o `INACTIVO`.
