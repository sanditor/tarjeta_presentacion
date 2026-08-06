/*
Pasos para crear un Web App en Google Apps Script:
1. Abre Google Apps Script y crea un nuevo proyecto.
2. Copia y pega este código en el editor de scripts.
3. Guarda el proyecto.
4. Haz clic en "Implementar" > "Nueva implementación".
5. Selecciona "Tipo de implementación" como "Aplicación web".
6. Configura los permisos de acceso según tus necesidades (por ejemplo, "Cualquiera, incluso anónimo").
7. Haz clic en "Implementar" y copia la URL del Web App.
8. Ahora puedes enviar solicitudes  POST a esa URL para guardar citas en la hoja de cálculo.
*/

//https://script.google.com/macros/s/AKfycbzKmJLe6y-G-Jqolqyw0KBJ-zhaVcSr0pBbtpzzq0NMJrh9zK-Nh64ehj_QeDin9zV0kg/exec?action=getAppointments&callback=testCallback

const SHEET_ID = "1DfzxZCJrruEcPZ52V00vSx8uU1YQ09TC38IrihbJK68";
const SHEET_NAME = "Citas";

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  const headers = [
    "id",
    "date",
    "time",
    "clientName",
    "clientEmail",
    "description",
    "createdAt",
    "source",
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  return sheet;
}

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || "";
  const callback = params.callback;

  switch (action) {
    case "getAppointments":
      return getAppointments(callback);

    case "saveAppointment":
      return saveAppointment(params, callback);

    case "deleteAppointment":
      return deleteAppointment(params.id, callback);

    default:
      return buildResponse(
        {
          success: false,
          error: "Acción no válida",
        },
        callback,
      );
  }
}

function getAppointments(callback) {
  const sheet = getSheet();

  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return buildResponse(
      {
        success: true,
        appointments: [],
      },
      callback,
    );
  }

  const headers = values[0];

  const appointments = values.slice(1).map((row) => {
    let obj = {};

    headers.forEach((header, index) => {
      obj[header] = row[index];
    });

    return obj;
  });

  return buildResponse(
    {
      success: true,
      appointments: appointments,
    },
    callback,
  );
}

function saveAppointment(params, callback) {
  const sheet = getSheet();

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][1]) === String(params.date) &&
      String(data[i][2]) === String(params.time)
    ) {
      return buildResponse(
        {
          success: false,
          error: "Ese horario ya fue reservado.",
        },
        callback,
      );
    }
  }

  sheet.appendRow([
    params.id,
    params.date,
    params.time,
    params.clientName,
    params.clientEmail,
    params.description,
    params.createdAt,
    params.source,
  ]);

  sendAppointmentEmails(params);

  return buildResponse(
    {
      success: true,
    },
    callback,
  );
}

function sendAppointmentEmails(params) {
  const fecha = new Date(params.date);

  const fechaTexto = Utilities.formatDate(
    fecha,
    Session.getScriptTimeZone(),
    "dd/MM/yyyy",
  );

  // ============================
  // CORREO PARA EL CLIENTE
  // ============================

  const asuntoCliente = "✅ Tu cita ha sido confirmada";

  const htmlCliente = `
  <div style="font-family:Arial,sans-serif;background:#f4f6f8;padding:30px;">

    <div style="max-width:650px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.15);">

      <div style="background:#005f73;padding:25px;text-align:center;">

        <img
            src="https://i.postimg.cc/xdVLhrDg/logo-Empresa-Sanditor.jpg"
            alt="Sandor Soluciones TI"
            style="
                width:80px;
                height:auto;
                border-radius:10px;
                margin-bottom:12px;
                background:white;
                padding:6px;
            ">

        <h1 style="
            color:white;
            margin:0;
            font-size:28px;
        ">
            📅 Cita Confirmada
        </h1>

        <p style="
            color:#d7f3f6;
            margin-top:8px;
            font-size:15px;
        ">
            Gracias por confiar en Sandor Soluciones TI
        </p>
    </div>

      <div style="padding:30px;">

        <p>Hola <strong>${params.clientName}</strong>,</p>

        <p>
          Hemos recibido correctamente tu solicitud de cita.
        </p>

        <table style="width:100%;border-collapse:collapse;margin-top:20px;">

          <tr>
            <td style="padding:10px;font-weight:bold;">📅 Fecha</td>
            <td>${fechaTexto}</td>
          </tr>

          <tr style="background:#f7f7f7;">
            <td style="padding:10px;font-weight:bold;">🕘 Hora</td>
            <td>${params.time}</td>
          </tr>

          <tr>
            <td style="padding:10px;font-weight:bold;">📝 Descripción</td>
            <td>${params.description}</td>
          </tr>

        </table>

        <br>

        <p>
          Gracias por confiar en nuestros servicios.
        </p>

        <div style="text-align:center;margin-top:30px;">

          <a
            href="https://sanditor.github.io/tarjetaPresentacion/"
            style="
              background:#005f73;
              color:white;
              padding:14px 24px;
              text-decoration:none;
              border-radius:8px;
              font-weight:bold;
              display:inline-block;
            ">  
            🌐 Ver mi Tarjeta Digital 
          </a>       

          <br><br>

          <a
          href="mailto:sanditorl1978@gmail.com"
          style="
          background:#ee9b00;
          color:white;
          padding:12px 24px;
          border-radius:8px;
          text-decoration:none;
          font-weight:bold;
          display:inline-block;
          ">

          📧 Contactarme

          </a>

        </div>

      </div>

      <div style="
        background:#005f73;
        padding:20px;
        text-align:center;
        color:white;
        font-size:14px;
        ">

        <b>Sandor Soluciones TI</b>

        <br><br>

        Gracias por confiar en nosotros.

        <br><br>

        © 2026 Todos los derechos reservados.

        <br><br>

        <a
        href="https://www.linkedin.com/in/sandor-luque-28666b136"
        style="
        color:white;
        text-decoration:none;
        font-weight:bold;
        ">

        🔗 LinkedIn

        </a>

      </div>

    </div>

  </div>
  `;

  MailApp.sendEmail({
    to: params.clientEmail,

    subject: asuntoCliente,

    htmlBody: htmlCliente,
  });

  // ============================
  // CORREO PARA TI
  // ============================

  const asuntoAdmin = "📅 Nueva cita agendada";

  const htmlAdmin = `
  <div style="font-family:Arial,sans-serif">

    <div style="
      background:#005f73;
      padding:20px;
      text-align:center;
      border-radius:10px 10px 0 0;
  ">

      <img
          src="https://i.postimg.cc/xdVLhrDg/logo-Empresa-Sanditor.jpg"
          alt="Sandor Soluciones TI"
          style="
              width:70px;
              background:white;
              border-radius:8px;
              padding:5px;
              margin-bottom:10px;
          ">

      <h2 style="
          color:white;
          margin:0;
      ">
          📅 Nueva cita registrada
      </h2>

  </div>

  <br>

    <table border="1" cellpadding="8" cellspacing="0"
      style="border-collapse:collapse">

      <tr>
        <th align="left">Nombre</th>
        <td>${params.clientName}</td>
      </tr>

      <tr>
        <th align="left">Correo</th>
        <td>${params.clientEmail}</td>
      </tr>

      <tr>
        <th align="left">Fecha</th>
        <td>${fechaTexto}</td>
      </tr>

      <tr>
        <th align="left">Hora</th>
        <td>${params.time}</td>
      </tr>

      <tr>
        <th align="left">Descripción</th>
        <td>${params.description}</td>
      </tr>

    </table>

  </div>
  `;

  MailApp.sendEmail({
    to: "sanditorl1978@gmail.com",

    subject: asuntoAdmin,

    htmlBody: htmlAdmin,
  });
}

function deleteAppointment(id, callback) {
  const sheet = getSheet();

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);

      return buildResponse(
        {
          success: true,
        },
        callback,
      );
    }
  }

  return buildResponse(
    {
      success: false,
      error: "No se encontró la cita.",
    },
    callback,
  );
}

function buildResponse(obj, callback) {
  const json = JSON.stringify(obj);

  const output = callback ? `${callback}(${json})` : json;

  return ContentService.createTextOutput(output).setMimeType(
    callback
      ? ContentService.MimeType.JAVASCRIPT
      : ContentService.MimeType.JSON,
  );
}