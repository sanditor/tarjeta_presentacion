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
const OPINIONES_SHEET_NAME = "Opiniones";
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

  const headers = ["id", "name", "service", "rating", "comment", "createdAt"];

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
      return deleteAppointment(params.id, params.deleteToken, callback);

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

  const idIndex = headers.indexOf("id");

  const dateIndex = headers.indexOf("date");

  const timeIndex = headers.indexOf("time");

  const createdAtIndex = headers.indexOf("createdAt");

  const sourceIndex = headers.indexOf("source");

  const appointments = values.slice(1).map((row) => ({
    id: idIndex >= 0 ? row[idIndex] : "",

    date: dateIndex >= 0 ? row[dateIndex] : "",

    time: timeIndex >= 0 ? row[timeIndex] : "",

    createdAt: createdAtIndex >= 0 ? row[createdAtIndex] : "",

    source: sourceIndex >= 0 ? row[sourceIndex] : "",
  }));

  return buildResponse(
    {
      success: true,
      appointments: appointments,
    },
    callback,
  );
}

function hashDeleteToken(token) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(token),
    Utilities.Charset.UTF_8,
  );

  return digest
    .map(function (byte) {
      const value = byte < 0 ? byte + 256 : byte;

      return value.toString(16).padStart(2, "0");
    })
    .join("");
}

function saveAppointment(params, callback) {
  const lock = LockService.getScriptLock();

  let lockObtained = false;
  let appointmentSaved = false;

  try {
    // =========================================
    // BLOQUEAR SOLO LA PARTE CRÍTICA
    // =========================================

    lock.waitLock(15000);
    lockObtained = true;

    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();

    const id = String(params.id || "").trim();

    const date = String(params.date || "").trim();

    const time = String(params.time || "").trim();

    const deleteToken = String(params.deleteToken || "").trim();

    // =========================================
    // VALIDACIONES
    // =========================================

    if (!id) {
      return buildResponse(
        {
          success: false,
          error: "No se recibió el identificador de la cita.",
        },
        callback,
      );
    }

    if (!date || !time) {
      return buildResponse(
        {
          success: false,
          error: "La fecha y la hora son obligatorias.",
        },
        callback,
      );
    }

    if (!deleteToken) {
      return buildResponse(
        {
          success: false,
          error: "No se recibió el token de seguridad.",
        },
        callback,
      );
    }

    if (!/^[a-f0-9]{64}$/i.test(deleteToken)) {
      return buildResponse(
        {
          success: false,
          error: "El token de seguridad no es válido.",
        },
        callback,
      );
    }

    // =========================================
    // CONTROL DE DUPLICADO POR ID
    // =========================================

    for (let i = 1; i < data.length; i++) {
      const existingId = String(data[i][0] || "").trim();

      if (existingId === id) {
        console.log("Cita ya procesada:", id);

        return buildResponse(
          {
            success: true,
            duplicate: true,
            id: id,
          },
          callback,
        );
      }
    }

    // =========================================
    // CONTROL DE HORARIO
    // =========================================

    for (let i = 1; i < data.length; i++) {
      const existingDate = String(data[i][1] || "");

      const existingTime = String(data[i][2] || "");

      if (existingDate === date && existingTime === time) {
        return buildResponse(
          {
            success: false,
            error: "Ese horario ya fue reservado.",
          },
          callback,
        );
      }
    }

    // =========================================
    // GUARDAR
    // =========================================

    const deleteTokenHash = hashDeleteToken(deleteToken);

    sheet.appendRow([
      id,
      date,
      time,
      params.clientName,
      params.clientEmail,
      params.description,
      params.createdAt,
      params.source,
      deleteTokenHash,
    ]);

    SpreadsheetApp.flush();

    appointmentSaved = true;

    // =========================================
    // LIBERAR EL LOCK INMEDIATAMENTE
    // =========================================

    lock.releaseLock();
    lockObtained = false;

    console.log("Cita guardada:", id);

    // =========================================
    // CORREOS
    // =========================================
    //
    // Si el correo falla, NO debemos decir
    // que la cita no se guardó.
    // =========================================

    try {
      sendAppointmentEmails(params);
    } catch (emailError) {
      console.error("La cita fue guardada pero falló el correo:", emailError);
    }

    // =========================================
    // RESPUESTA FINAL
    // =========================================

    return buildResponse(
      {
        success: true,
        duplicate: false,
        id: id,
      },
      callback,
    );
  } catch (error) {
    console.error("saveAppointment:", error);

    /*
     * Si alcanzó a guardarse antes de producirse
     * otro error, no informamos falsamente que
     * la cita falló.
     */
    if (appointmentSaved) {
      return buildResponse(
        {
          success: true,
          saved: true,
          warning: "La cita fue guardada correctamente.",
        },
        callback,
      );
    }

    return buildResponse(
      {
        success: false,
        error: error.message || "Error guardando la cita.",
      },
      callback,
    );
  } finally {
    if (lockObtained) {
      try {
        lock.releaseLock();
      } catch (error) {
        // Ignorar
      }
    }
  }
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
    encodeURIComponent(String(params.id || "")) +
    "&token=" +
    encodeURIComponent(String(params.deleteToken || ""));

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

function deleteAppointment(id, deleteToken, callback) {
  const lock = LockService.getScriptLock();

  let lockObtained = false;

  try {
    // ========================================
    // BLOQUEAR OPERACIONES SIMULTÁNEAS
    // ========================================

    lock.waitLock(10000);

    lockObtained = true;

    const appointmentIdToDelete = String(id || "").trim();

    const token = String(deleteToken || "").trim();

    // ========================================
    // VALIDACIONES
    // ========================================

    if (!appointmentIdToDelete) {
      return buildResponse(
        {
          success: false,
          error: "No se recibió el identificador de la cita.",
        },
        callback,
      );
    }

    if (!token) {
      return buildResponse(
        {
          success: false,
          error: "No tienes autorización para eliminar esta cita.",
        },
        callback,
      );
    }

    /*
     * El token generado por main.js
     * tiene exactamente 64 caracteres
     * hexadecimales.
     */
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return buildResponse(
        {
          success: false,
          error: "El token de cancelación no es válido.",
        },
        callback,
      );
    }

    // ========================================
    // HASH DEL TOKEN RECIBIDO
    // ========================================

    const receivedHash = hashDeleteToken(token);

    // ========================================
    // CONTROL DE REINTENTOS
    // ========================================
    //
    // Puede ocurrir esto:
    //
    // 1. Apps Script elimina la cita.
    // 2. El navegador no recibe la respuesta.
    // 3. JSONP genera timeout.
    // 4. main.js intenta nuevamente.
    //
    // En ese caso NO queremos responder:
    // "La cita no existe".
    //
    // Guardaremos temporalmente la evidencia
    // de que esa cita ya fue eliminada.
    // ========================================

    const cache = CacheService.getScriptCache();

    const deletedCacheKey = "deletedAppointment_" + appointmentIdToDelete;

    const previousDeleteHash = cache.get(deletedCacheKey);

    /*
     * Si el MISMO token ya eliminó esta
     * misma cita recientemente,
     * consideramos este reintento exitoso.
     */
    if (previousDeleteHash && previousDeleteHash === receivedHash) {
      console.log("Reintento de cancelación detectado:", appointmentIdToDelete);

      return buildResponse(
        {
          success: true,
          alreadyDeleted: true,
          id: appointmentIdToDelete,
        },
        callback,
      );
    }

    // ========================================
    // LEER HOJA
    // ========================================

    const sheet = getSheet();

    const data = sheet.getDataRange().getValues();

    const headers = data[0];

    const idIndex = headers.indexOf("id");

    const tokenIndex = headers.indexOf("deleteTokenHash");

    if (idIndex === -1 || tokenIndex === -1) {
      return buildResponse(
        {
          success: false,
          error: "La hoja de citas no está configurada correctamente.",
        },
        callback,
      );
    }

    // ========================================
    // BUSCAR CITA
    // ========================================

    for (let i = 1; i < data.length; i++) {
      const appointmentId = String(data[i][idIndex] || "").trim();

      /*
       * No es la cita que buscamos.
       */
      if (appointmentId !== appointmentIdToDelete) {
        continue;
      }

      const storedHash = String(data[i][tokenIndex] || "").trim();

      // ========================================
      // CITA ANTIGUA SIN TOKEN
      // ========================================

      if (!storedHash) {
        return buildResponse(
          {
            success: false,
            error: "Esta cita no dispone de autorización de cancelación.",
          },
          callback,
        );
      }

      // ========================================
      // COMPROBAR TOKEN
      // ========================================

      if (storedHash !== receivedHash) {
        return buildResponse(
          {
            success: false,
            error: "No tienes autorización para eliminar esta cita.",
          },
          callback,
        );
      }

      // ========================================
      // TOKEN CORRECTO: ELIMINAR
      // ========================================

      sheet.deleteRow(i + 1);

      SpreadsheetApp.flush();

      // ========================================
      // RECORDAR LA ELIMINACIÓN
      // ========================================
      //
      // Durante 10 minutos Apps Script sabrá
      // que esta misma cita ya fue eliminada
      // con este mismo token.
      //
      // 600 segundos = 10 minutos.
      // ========================================

      cache.put(deletedCacheKey, receivedHash, 600);

      console.log("Cita cancelada correctamente:", appointmentIdToDelete);

      return buildResponse(
        {
          success: true,
          alreadyDeleted: false,
          id: appointmentIdToDelete,
        },
        callback,
      );
    }

    // ========================================
    // NO SE ENCONTRÓ LA CITA
    // ========================================

    return buildResponse(
      {
        success: false,
        error: "La cita ya no existe o ya fue cancelada.",
      },
      callback,
    );
  } catch (error) {
    console.error("deleteAppointment:", error);

    return buildResponse(
      {
        success: false,
        error: error.message || "No fue posible cancelar la cita.",
      },
      callback,
    );
  } finally {
    // ========================================
    // LIBERAR LOCK
    // ========================================

    if (lockObtained) {
      try {
        lock.releaseLock();
      } catch (error) {
        // Ignorar error al liberar lock.
      }
    }
  }
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
    return buildResponse(
      {
        success: true,
        opiniones: [],
      },
      callback,
    );
  }

  const headers = values[0];

  const opiniones = values.slice(1).map((row) => {
    let obj = {};

    headers.forEach((header, index) => {
      obj[header] = row[index];
    });

    return obj;
  });

  return buildResponse(
    {
      success: true,
      opiniones: opiniones,
    },
    callback,
  );
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

    const id = String(params.id || "").trim();

    const name = String(params.name || "").trim();

    const service = String(params.service || "").trim();

    const rating = String(params.rating || "").trim();

    const comment = String(params.comment || "").trim();

    // ==========================
    // VALIDACIONES
    // ==========================

    if (!id || !name || !service || !rating || !comment) {
      return buildResponse(
        {
          success: false,
          error: "Todos los campos son obligatorios.",
        },
        callback,
      );
    }

    const ratingNumber = Number(rating);

    if (
      !Number.isInteger(ratingNumber) ||
      ratingNumber < 1 ||
      ratingNumber > 5
    ) {
      return buildResponse(
        {
          success: false,
          error: "La calificación debe estar entre 1 y 5.",
        },
        callback,
      );
    }

    // ==========================
    // CONTROL DE DUPLICADOS
    // ==========================

    const lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      const existingIds = sheet
        .getRange(2, 1, lastRow - 1, 1)
        .getDisplayValues();

      const alreadyExists = existingIds.some((row) => String(row[0]) === id);

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
            id: id,
          },
          callback,
        );
      }
    }

    // ==========================
    // GUARDAR
    // ==========================

    const createdAt = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "dd/MM/yyyy HH:mm:ss",
    );

    sheet.appendRow([id, name, service, ratingNumber, comment, createdAt]);

    SpreadsheetApp.flush();

    return buildResponse(
      {
        success: true,
        duplicate: false,
        id: id,
      },
      callback,
    );
  } catch (error) {
    console.error("saveOpinion:", error);

    return buildResponse(
      {
        success: false,
        error: error.message || "Error guardando la opinión.",
      },
      callback,
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