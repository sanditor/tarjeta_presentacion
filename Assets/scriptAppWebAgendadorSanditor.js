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

const SHEET_ID = "1DfzxZCJrruEcPZ52V00vSx8uU1YQ09TC38IrihbJK68";
const SHEET_NAME = "Citas";
const OPINIONES_SHEET_NAME = 'Opiniones';
const PUBLIC_CARD_URL = "https://sanditor.github.io/tarjeta_presentacion/";

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
    "deleteTokenHash",
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  return sheet;
}

function getOpinionesSheet() {

  const ss = SpreadsheetApp.openById(SHEET_ID);

  let sheet = ss.getSheetByName(OPINIONES_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(OPINIONES_SHEET_NAME);
  }

  const headers = [
    'id',
    'name',
    'service',
    'rating',
    'comment',
    'createdAt'
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
      return deleteAppointment(params.id,params.deleteToken, callback);
    
    case "getOpiniones":
      return getOpiniones(callback);

    case "saveOpinion":
      return saveOpinion(params, callback);

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

  const values =
    sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return buildResponse(
      {
        success: true,
        appointments: [],
      },
      callback
    );
  }

  const headers = values[0];

  const idIndex =
    headers.indexOf("id");

  const dateIndex =
    headers.indexOf("date");

  const timeIndex =
    headers.indexOf("time");

  const createdAtIndex =
    headers.indexOf("createdAt");

  const sourceIndex =
    headers.indexOf("source");

  const appointments =
    values
      .slice(1)
      .map((row) => ({
        id:
          idIndex >= 0
            ? row[idIndex]
            : "",

        date:
          dateIndex >= 0
            ? row[dateIndex]
            : "",

        time:
          timeIndex >= 0
            ? row[timeIndex]
            : "",

        createdAt:
          createdAtIndex >= 0
            ? row[createdAtIndex]
            : "",

        source:
          sourceIndex >= 0
            ? row[sourceIndex]
            : "",
      }));

  return buildResponse(
    {
      success: true,
      appointments:
        appointments,
    },
    callback
  );
}

function hashDeleteToken(token) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(token),
    Utilities.Charset.UTF_8
  );

  return digest
    .map(function (byte) {
      const value =
        byte < 0
          ? byte + 256
          : byte;

      return value
        .toString(16)
        .padStart(2, "0");
    })
    .join("");
}

function saveAppointment(params, callback) {
  const sheet = getSheet();

  const data = sheet.getDataRange().getValues();

  // ============================
  // VALIDAR TOKEN DE CANCELACIÓN
  // ============================

  const deleteToken =
    String(params.deleteToken || "").trim();

  if (!deleteToken) {
    return buildResponse(
      {
        success: false,
        error:
          "No se recibió el token de seguridad de la cita.",
      },
      callback
    );
  }

  if (!/^[a-f0-9]{64}$/i.test(deleteToken)) {
    return buildResponse(
      {
        success: false,
        error:
          "El token de seguridad no es válido.",
      },
      callback
    );
  }

  // ============================
  // VERIFICAR HORARIO
  // ============================

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][1]) ===
        String(params.date) &&
      String(data[i][2]) ===
        String(params.time)
    ) {
      return buildResponse(
        {
          success: false,
          error:
            "Ese horario ya fue reservado.",
        },
        callback
      );
    }
  }

  // Nunca guardamos el token original.
  const deleteTokenHash =
    hashDeleteToken(deleteToken);

  // ============================
  // GUARDAR CITA
  // ============================

  sheet.appendRow([
    params.id,
    params.date,
    params.time,
    params.clientName,
    params.clientEmail,
    params.description,
    params.createdAt,
    params.source,
    deleteTokenHash,
  ]);

  // Conservamos tus correos actuales
  sendAppointmentEmails(params);

  return buildResponse(
    {
      success: true,
    },
    callback
  );
}

function sendAppointmentEmails(params) {
  const fecha = new Date(params.date);

  const fechaTexto = Utilities.formatDate(
    fecha,
    Session.getScriptTimeZone(),
    "dd/MM/yyyy",
  );

  // ============================================
  // ENLACE PRIVADO DE CANCELACIÓN
  // ============================================

  const cancelUrl =
    PUBLIC_CARD_URL +
    "?cancelAppointment=" +
    encodeURIComponent(
      String(params.id || "")
    ) +
    "&token=" +
    encodeURIComponent(
      String(params.deleteToken || "")
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
            href="https://sanditor.github.io/tarjeta_presentacion/"
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

          <br><br>

          <a
            href="${cancelUrl}"
            style="
              background:#b91c1c;
              color:white;
              padding:12px 24px;
              border-radius:8px;
              text-decoration:none;
              font-weight:bold;
              display:inline-block;
            "
          >
            ❌ Cancelar mi cita
          </a>

          <p
            style="
              margin-top:14px;
              color:#6b7280;
              font-size:12px;
              line-height:1.5;
            "
          >
            Este enlace es privado y permite
            cancelar únicamente esta cita.
            No lo compartas con otras personas.
          </p>

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

function deleteAppointment(
  id,
  deleteToken,
  callback
) {
  const sheet = getSheet();

  const data =
    sheet.getDataRange().getValues();

  if (!id) {
    return buildResponse(
      {
        success: false,
        error:
          "No se recibió el identificador de la cita.",
      },
      callback
    );
  }

  if (!deleteToken) {
    return buildResponse(
      {
        success: false,
        error:
          "No tienes autorización para eliminar esta cita.",
      },
      callback
    );
  }

  // Encabezados de Google Sheets
  const headers = data[0];

  const idIndex =
    headers.indexOf("id");

  const tokenIndex =
    headers.indexOf("deleteTokenHash");

  if (
    idIndex === -1 ||
    tokenIndex === -1
  ) {
    return buildResponse(
      {
        success: false,
        error:
          "La hoja de citas no está configurada correctamente.",
      },
      callback
    );
  }

  // Hash del token enviado por el navegador
  const receivedHash =
    hashDeleteToken(deleteToken);

  for (
    let i = 1;
    i < data.length;
    i++
  ) {
    const appointmentId =
      String(data[i][idIndex]);

    if (
      appointmentId === String(id)
    ) {
      const storedHash =
        String(
          data[i][tokenIndex] || ""
        ).trim();

      // Citas antiguas sin token
      if (!storedHash) {
        return buildResponse(
          {
            success: false,
            error:
              "Esta cita no dispone de autorización de cancelación.",
          },
          callback
        );
      }

      // El token no pertenece a esa cita
      if (
        storedHash !== receivedHash
      ) {
        return buildResponse(
          {
            success: false,
            error:
              "No tienes autorización para eliminar esta cita.",
          },
          callback
        );
      }

      // Token correcto
      sheet.deleteRow(i + 1);

      SpreadsheetApp.flush();

      return buildResponse(
        {
          success: true,
        },
        callback
      );
    }
  }

  return buildResponse(
    {
      success: false,
      error:
        "No se encontró la cita.",
    },
    callback
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

function getOpiniones(callback) {

  const sheet = getOpinionesSheet();

  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {

    return buildResponse({
      success: true,
      opiniones: []
    }, callback);

  }

  const headers = values[0];

  const opiniones = values.slice(1).map(row => {

    let obj = {};

    headers.forEach((header, index) => {

      obj[header] = row[index];

    });

    return obj;

  });

  return buildResponse({
    success: true,
    opiniones: opiniones
  }, callback);

}

function saveOpinion(params, callback) {

  const lock = LockService.getScriptLock();

  try {

    /*
     * Evita que dos solicitudes simultáneas
     * escriban al mismo tiempo.
     */
    lock.waitLock(10000);

    const sheet = getOpinionesSheet();

    const id =
      String(params.id || "").trim();

    const name =
      String(params.name || "").trim();

    const service =
      String(params.service || "").trim();

    const rating =
      String(params.rating || "").trim();

    const comment =
      String(params.comment || "").trim();

    // ==========================
    // VALIDACIONES
    // ==========================

    if (
      !id ||
      !name ||
      !service ||
      !rating ||
      !comment
    ) {

      return buildResponse(
        {
          success: false,
          error:
            "Todos los campos son obligatorios."
        },
        callback
      );
    }

    const ratingNumber =
      Number(rating);

    if (
      !Number.isInteger(ratingNumber) ||
      ratingNumber < 1 ||
      ratingNumber > 5
    ) {

      return buildResponse(
        {
          success: false,
          error:
            "La calificación debe estar entre 1 y 5."
        },
        callback
      );
    }

    // ==========================
    // CONTROL DE DUPLICADOS
    // ==========================

    const lastRow =
      sheet.getLastRow();

    if (lastRow > 1) {

      const existingIds =
        sheet
          .getRange(
            2,
            1,
            lastRow - 1,
            1
          )
          .getDisplayValues();

      const alreadyExists =
        existingIds.some(
          (row) =>
            String(row[0]) === id
        );

      /*
       * La solicitud ya fue procesada.
       *
       * Respondemos success true para que
       * el frontend no intente enviarla
       * nuevamente.
       */
      if (alreadyExists) {

        return buildResponse(
          {
            success: true,
            duplicate: true,
            id: id
          },
          callback
        );
      }
    }

    // ==========================
    // GUARDAR
    // ==========================

    const createdAt =
      Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        "dd/MM/yyyy HH:mm:ss"
      );

    sheet.appendRow([
      id,
      name,
      service,
      ratingNumber,
      comment,
      createdAt
    ]);

    SpreadsheetApp.flush();

    return buildResponse(
      {
        success: true,
        duplicate: false,
        id: id
      },
      callback
    );

  } catch (error) {

    console.error(
      "saveOpinion:",
      error
    );

    return buildResponse(
      {
        success: false,
        error:
          error.message ||
          "Error guardando la opinión."
      },
      callback
    );

  } finally {

    /*
     * Liberar LockService solamente
     * si realmente obtuvimos el lock.
     */
    try {
      lock.releaseLock();
    } catch (error) {
      // No hacer nada
    }
  }
}