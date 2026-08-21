// --- Lógica principal (mantenida igual para asegurar estabilidad) ---
const servicesBtn = document.getElementById("services-btn");
const servicesModal = document.getElementById("services-modal");

if (servicesBtn && servicesModal) {
  const openModal = () => servicesModal.classList.add("active");
  const closeModal = () => servicesModal.classList.remove("active");
  servicesBtn.addEventListener("click", openModal);
  servicesModal
    .querySelector(".modal-close-btn")
    .addEventListener("click", closeModal);
  /*servicesModal.addEventListener("click", (event) => {
    if (event.target === servicesModal) closeModal()
  });*/
}

// --- Lógica para el Modal de Horario ---
const horarioBtn = document.getElementById("horario-btn");
const horarioModal = document.getElementById("horario-modal");

if (horarioBtn && horarioModal) {
  const openHorarioModal = () => horarioModal.classList.add("active");
  const closeHorarioModal = () => horarioModal.classList.remove("active");
  horarioBtn.addEventListener("click", openHorarioModal);
  horarioModal
    .querySelector(".modal-close-btn")
    .addEventListener("click", closeHorarioModal);
  /*horarioModal.addEventListener("click", (event) => {
    if (event.target === horarioModal) closeHorarioModal();
  });*/
}

// --- Lógica para el Modal de Instalación ---
const installBtn = document.getElementById("install-btn");
const installModal = document.getElementById("install-modal");

if (installBtn && installModal) {
  const openInstallModal = () => installModal.classList.add("active");
  const closeInstallModal = () => installModal.classList.remove("active");
  installBtn.addEventListener("click", openInstallModal);
  installModal
    .querySelector(".modal-close-btn")
    .addEventListener("click", closeInstallModal);
  /*installModal.addEventListener("click", (event) => {
    if (event.target === installModal) closeInstallModal();
  });*/
}

// --- Lógica para el Modal de Código QR ---
const qrCodeBtn = document.getElementById("qr-code-btn");
const qrCodeModal = document.getElementById("qr-code-modal");

if (qrCodeBtn && qrCodeModal) {
  const openQrCodeModal = () => qrCodeModal.classList.add("active");
  const closeQrCodeModal = () => qrCodeModal.classList.remove("active");
  qrCodeBtn.addEventListener("click", openQrCodeModal);
  qrCodeModal
    .querySelector(".modal-close-btn")
    .addEventListener("click", closeQrCodeModal);
  /*qrCodeModal.addEventListener("click", (event) => {
    if (event.target === qrCodeModal) closeQrCodeModal();
  });*/
}

// --- Lógica para el Modal de OPINIONES ---
const opinionesBtn = document.getElementById("opiniones-btn");
const opinionesModal = document.getElementById("opiniones-modal");

if (opinionesBtn && opinionesModal) {
  const openOpinionesModal = async () => {
    opinionesModal.classList.add("active");

    const lista = document.getElementById("opiniones-list");

    if (!lista) return;

    /*
     * Si ya tenemos datos,
     * mostrarlos inmediatamente.
     */
    if (opinionesLoaded) {
      renderOpinionesPaginationList(lista);

      return;
    }

    lista.innerHTML = `
    <p class="text-sm text-gray-500 text-center py-4">
      Cargando opiniones...
    </p>
  `;

    await fetchOpinionesFromSheet();

    renderOpinionesPaginationList(lista);
  };

  const closeOpinionesModal = () => {
    opinionesModal.classList.remove("active");
  };

  // Abrir modal
  opinionesBtn.addEventListener("click", openOpinionesModal);

  // Cerrar únicamente con el botón X
  const closeBtn = opinionesModal.querySelector(".modal-close-btn");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeOpinionesModal);
  }
}

// --- Lógica para Guardar Contacto ---
const saveContactBtn = document.getElementById("save-contact-btn");
if (saveContactBtn) {
  const saveContact = () => {
    const vCard =
      "BEGIN:VCARD\n" +
      "VERSION:3.0\n" +
      "FN:Ing. Sandor Luque Farfán\n" +
      "TEL;TYPE=WORK,VOICE:573124769266\n" +
      "EMAIL:sandorsolucionesti@gmail.com\n" +
      "END:VCARD";
    const blob = new Blob([vCard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "IngSandorLuqueFarfan.vcf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  saveContactBtn.addEventListener("click", saveContact);
}

// --- Lógica para el Modal de AGENDAR CITA ---
const agendarBtn = document.getElementById("agendar-btn");
const agendarModal = document.getElementById("agendar-modal");

let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;
let clientName = "";
let clientEmail = "";
let appointmentSending = false;
const APPOINTMENT_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzRovk-eqgb1kHXPmZD-cEL0u_upvJ9icDslCQcZ6rEh1ybV-M3mDa8J0NOgzlqtwDjvg/exec";

// ---Agendador---
let remoteAppointments = [];
let remoteAppointmentsLoaded = false;
let appointmentsLoadingPromise = null;
let appointmentsLoadedAt = 0;
const APPOINTMENTS_CACHE_MS = 30000;
const APPOINTMENT_TOKEN_PREFIX = "sandor_appointment_delete_";

// Paginación de la agenda
let agendaPage = 1;
const APPOINTMENTS_PER_PAGE = 2;

// --- Opiniones ---
let remoteOpiniones = [];
let opinionesPage = 1;
const OPINIONES_PER_PAGE = 2;

// Control de carga y caché
let opinionesLoaded = false;
let opinionesLoadingPromise = null;

// Evita doble envío
let opinionSending = false;

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeTime = (time) => {
  if (!time && time !== 0) return "";
  if (typeof time === "string") {
    const simpleTime = time.trim();
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(simpleTime)) {
      return simpleTime.substring(0, 5);
    }
    const parsed = new Date(simpleTime);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return simpleTime;
  }
  if (time instanceof Date && !isNaN(time.getTime())) {
    return time.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return String(time);
};

const formatDisplayDate = (rawDate) => {
  const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (isNaN(date.getTime())) return rawDate || "";
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const formatDisplayDateTime = (rawDate) => {
  const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (isNaN(date.getTime())) return rawDate || "";
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Generar token criptográficamente aleatorio
const generateAppointmentDeleteToken = () => {
  const bytes = new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

// Guardar el token únicamente en este navegador
const saveAppointmentDeleteToken = (appointmentId, token) => {
  try {
    localStorage.setItem(
      APPOINTMENT_TOKEN_PREFIX + String(appointmentId),
      token,
    );

    return true;
  } catch (error) {
    console.error("No fue posible guardar el token de la cita:", error);

    return false;
  }
};

// Recuperar token
const getAppointmentDeleteToken = (appointmentId) => {
  try {
    return (
      localStorage.getItem(APPOINTMENT_TOKEN_PREFIX + String(appointmentId)) ||
      ""
    );
  } catch (error) {
    console.error("Error leyendo token:", error);

    return "";
  }
};

// Eliminar token cuando se cancela la cita
const removeAppointmentDeleteToken = (appointmentId) => {
  try {
    localStorage.removeItem(APPOINTMENT_TOKEN_PREFIX + String(appointmentId));
  } catch (error) {
    console.error("Error eliminando token local:", error);
  }
};

//Función para la respuesta del json del backend
const loadJsonp = (url, timeout = 25000) => {
  return new Promise((resolve, reject) => {
    const callbackName =
      "jsonpCallback_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2, 10);

    const script = document.createElement("script");

    let finished = false;

    const separator = url.includes("?") ? "&" : "?";

    script.src =
      `${url}${separator}` +
      `callback=${encodeURIComponent(callbackName)}` +
      `&_jsonp=${Date.now()}`;

    script.async = true;

    const removeScript = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const safeCleanupCallback = () => {
      /*
       * NO borrar inmediatamente.
       *
       * Google Apps Script puede responder tarde.
       * Si llega después del timeout y ya borramos
       * la función, aparecerá:
       *
       * callback_xxx is not defined
       */

      window[callbackName] = function () {
        console.warn("Respuesta JSONP tardía ignorada:", callbackName);
      };

      setTimeout(() => {
        try {
          delete window[callbackName];
        } catch {
          window[callbackName] = undefined;
        }
      }, 60000);
    };

    const timer = setTimeout(() => {
      if (finished) return;

      finished = true;

      removeScript();

      safeCleanupCallback();

      reject(new Error(`JSONP timeout después de ${timeout / 1000} segundos`));
    }, timeout);

    window[callbackName] = (data) => {
      if (finished) return;

      finished = true;

      clearTimeout(timer);

      removeScript();

      safeCleanupCallback();

      resolve(data);
    };

    script.onerror = () => {
      if (finished) return;

      finished = true;

      clearTimeout(timer);

      removeScript();

      safeCleanupCallback();

      reject(new Error("Error cargando respuesta JSONP de Apps Script."));
    };

    document.head.appendChild(script);
  });
};

//función central para hablar con Google Apps Script
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestAppsScript = async (
  url,
  { retries = 3, timeout = 25000, useFetchFirst = true } = {},
) => {
  let lastError = null;

  /*
   * PRIMER INTENTO:
   * fetch normal.
   */
  if (useFetchFirst) {
    try {
      const controller = new AbortController();

      const timer = setTimeout(() => {
        controller.abort();
      }, timeout);

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      console.log("Apps Script vía fetch:", result);

      return result;
    } catch (error) {
      lastError = error;

      console.warn("Fetch Apps Script falló. Probando JSONP...", error);
    }
  }

  /*
   * FALLBACK:
   * JSONP con reintentos.
   */
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`JSONP intento ${attempt}/${retries}`);

      const result = await loadJsonp(url, timeout);

      console.log("Apps Script vía JSONP:", result);

      return result;
    } catch (error) {
      lastError = error;

      console.warn(`Falló JSONP intento ${attempt}:`, error);

      if (attempt < retries) {
        /*
         * 1 segundo
         * 2 segundos
         * 4 segundos
         */
        const wait = Math.pow(2, attempt - 1) * 1000;

        await sleep(wait);
      }
    }
  }

  throw (
    lastError || new Error("No fue posible conectar con Google Apps Script.")
  );
};

//Función para traer las opiniones
const fetchOpinionesFromSheet = async (forceRefresh = false) => {
  if (!APPOINTMENT_ENDPOINT) {
    console.error("No existe APPOINTMENT_ENDPOINT.");

    return remoteOpiniones;
  }

  /*
   * Si ya hay una solicitud en proceso,
   * utilizamos la misma Promise.
   *
   * No hacemos otra consulta a Google.
   */
  if (opinionesLoadingPromise && !forceRefresh) {
    console.log("Ya existe una carga de opiniones en proceso.");

    return opinionesLoadingPromise;
  }

  opinionesLoadingPromise = (async () => {
    const url =
      `${APPOINTMENT_ENDPOINT}` + `?action=getOpiniones` + `&_=${Date.now()}`;

    console.log("Cargando opiniones:", url);

    try {
      const result = await requestAppsScript(url, {
        retries: 3,
        timeout: 25000,
        useFetchFirst: true,
      });

      if (
        !result ||
        result.success !== true ||
        !Array.isArray(result.opiniones)
      ) {
        throw new Error(result?.error || "Respuesta inválida de Apps Script.");
      }

      remoteOpiniones = result.opiniones.map((opinion) => ({
        id: String(opinion.id || ""),

        name: String(opinion.name || ""),

        service: String(opinion.service || ""),

        rating: Number(opinion.rating || 0),

        comment: String(opinion.comment || ""),

        createdAt: String(opinion.createdAt || ""),
      }));

      /*
       * Más recientes primero
       */
      remoteOpiniones.reverse();

      opinionesPage = 1;

      opinionesLoaded = true;

      console.log(`Opiniones cargadas: ${remoteOpiniones.length}`);

      return remoteOpiniones;
    } catch (error) {
      console.error("Error cargando opiniones:", error);

      /*
       * MUY IMPORTANTE:
       *
       * Si Google falla temporalmente,
       * NO borrar las opiniones que ya
       * teníamos cargadas.
       */
      return remoteOpiniones;
    }
  })();

  try {
    return await opinionesLoadingPromise;
  } finally {
    opinionesLoadingPromise = null;
  }
};

//Función para mostrar las opiniones
const renderOpinionesPaginationList = (containerEl) => {
  if (!containerEl) return;

  // Si no hay opiniones
  if (!remoteOpiniones || remoteOpiniones.length === 0) {
    containerEl.innerHTML = `
            <div class="text-center py-6 text-gray-500">

                <i class="far fa-comment-dots text-3xl mb-2"></i>

                <p>Aún no hay opiniones.</p>

                <p class="text-sm mt-1">
                    ¡Sé el primero en dejar tu opinión!
                </p>

            </div>
        `;

    // Limpiar paginación
    const pagination = document.getElementById("opiniones-pagination");

    if (pagination) {
      pagination.innerHTML = "";
    }

    return;
  }

  // Calcular cantidad de páginas
  const totalPages = Math.ceil(remoteOpiniones.length / OPINIONES_PER_PAGE);

  // Evitar que la página actual quede fuera de rango
  if (opinionesPage > totalPages) {
    opinionesPage = totalPages;
  }

  if (opinionesPage < 1) {
    opinionesPage = 1;
  }

  // Determinar registros de la página actual
  const start = (opinionesPage - 1) * OPINIONES_PER_PAGE;

  const end = start + OPINIONES_PER_PAGE;

  const opinionesPagina = remoteOpiniones.slice(start, end);

  // Crear HTML de las opiniones
  containerEl.innerHTML = opinionesPagina
    .map((opinion) => {
      const stars = Array.from({ length: 5 }, (_, index) => {
        return index < opinion.rating
          ? '<i class="fas fa-star text-[#ee9b00]"></i>'
          : '<i class="far fa-star text-gray-300"></i>';
      }).join("");

      return `
            <div class="border border-gray-200 rounded-xl p-4 bg-gray-50 shadow-sm">

                <div class="flex items-start justify-between gap-3">

                    <div>

                        <h4 class="font-bold text-[#005f73]">
                            ${escapeHtml(opinion.name || "Cliente")}
                        </h4>

                        <p class="text-xs text-gray-500 mt-1">
                            ${escapeHtml(opinion.service || "")}
                        </p>

                    </div>

                    <div class="text-sm whitespace-nowrap">
                        ${stars}
                    </div>

                </div>

                <p class="text-sm text-gray-700 mt-3 leading-relaxed">
                    "${escapeHtml(opinion.comment || "")}"
                </p>

                <p class="text-xs text-gray-400 mt-3">
                    ${escapeHtml(formatOpinionDate(opinion.createdAt) || "")}
                </p>

            </div>
        `;
    })
    .join("");

  // Dibujar paginación
  renderOpinionesPaginationPagination(totalPages);
};

//función para formatear la fecha
const formatOpinionDate = (rawDate) => {
  if (!rawDate) return "";

  const date = new Date(rawDate);

  if (isNaN(date.getTime())) {
    return rawDate;
  }

  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  });
};

//Función para protección para los comentarios
const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

//Paginación de las opiniones
const renderOpinionesPaginationPagination = (totalPaginas) => {
  const pagination = document.getElementById("opiniones-pagination");

  if (!pagination) return;

  if (totalPaginas <= 1) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = `

        <button
            id="opiniones-prev-btn"
            type="button"
            class="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold
            ${
              opinionesPage === 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-[#005f73] hover:bg-gray-100"
            }"
            ${opinionesPage === 1 ? "disabled" : ""}
        >
            ← Anterior
        </button>

        <span class="text-sm font-semibold text-gray-600">
            Página ${opinionesPage} de ${totalPaginas}
        </span>

        <button
            id="opiniones-next-btn"
            type="button"
            class="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold
            ${
              opinionesPage === totalPaginas
                ? "text-gray-300 cursor-not-allowed"
                : "text-[#005f73] hover:bg-gray-100"
            }"
            ${opinionesPage === totalPaginas ? "disabled" : ""}
        >
            Siguiente →
        </button>
    `;

  const prevBtn = document.getElementById("opiniones-prev-btn");
  const nextBtn = document.getElementById("opiniones-next-btn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (opinionesPage <= 1) return;

      opinionesPage--;

      const lista = document.getElementById("opiniones-list");

      if (lista) {
        renderOpinionesPaginationList(lista);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (opinionesPage >= totalPaginas) return;

      opinionesPage++;

      const lista = document.getElementById("opiniones-list");

      if (lista) {
        renderOpinionesPaginationList(lista);
      }
    });
  }
};

//Función para el botón de actualizar
const refreshOpinionesBtn = document.getElementById("refresh-opiniones-btn");

if (refreshOpinionesBtn) {
  refreshOpinionesBtn.addEventListener("click", async () => {
    const lista = document.getElementById("opiniones-list");

    if (!lista) return;

    refreshOpinionesBtn.disabled = true;

    refreshOpinionesBtn.textContent = "Actualizando...";

    try {
      await fetchOpinionesFromSheet(true);

      renderOpinionesPaginationList(lista);
    } catch (error) {
      console.error(error);
    } finally {
      refreshOpinionesBtn.disabled = false;

      refreshOpinionesBtn.textContent = "Actualizar";
    }
  });
}

const getAllAppointments = () => remoteAppointments;

const isTimeSlotTaken = (date, time) => {
  const selectedKey = formatDateKey(date);
  const normalizedTime = normalizeTime(time);
  return getAllAppointments().some((appointment) => {
    const appointmentDate = new Date(appointment.date);
    return (
      formatDateKey(appointmentDate) === selectedKey &&
      normalizeTime(appointment.time) === normalizedTime
    );
  });
};

//Función para traer las citas desde Google Sheets
const fetchAppointmentsFromSheet = async (forceRefresh = false) => {
  if (!APPOINTMENT_ENDPOINT) {
    console.error("APPOINTMENT_ENDPOINT no está definido.");

    return remoteAppointments;
  }

  const now = Date.now();

  // Si los datos son recientes, no consultar Google otra vez.
  if (
    remoteAppointmentsLoaded &&
    !forceRefresh &&
    now - appointmentsLoadedAt < APPOINTMENTS_CACHE_MS
  ) {
    console.log("Agenda obtenida desde caché.");

    return remoteAppointments;
  }

  // Si ya existe una consulta en curso,
  // no lanzar una segunda solicitud.
  if (appointmentsLoadingPromise) {
    console.log("Ya existe una carga de agenda en proceso.");

    return appointmentsLoadingPromise;
  }

  appointmentsLoadingPromise = (async () => {
    const url =
      `${APPOINTMENT_ENDPOINT}` +
      `?action=getAppointments` +
      `&_=${Date.now()}`;

    console.log("Cargando agenda desde Google Sheets:", url);

    try {
      /*
       * IMPORTANTE:
       *
       * Desde localhost no intentamos fetch primero.
       * Vamos directamente por JSONP.
       */
      const result = await requestAppsScript(url, {
        retries: 2,
        timeout: 12000,
        useFetchFirst: false,
      });

      if (
        !result ||
        result.success !== true ||
        !Array.isArray(result.appointments)
      ) {
        throw new Error(result?.error || "Respuesta inválida del servidor.");
      }

      remoteAppointments = result.appointments.map((item) => ({
        id: String(item.id || ""),

        date: item.date || "",

        time: normalizeTime(item.time),

        clientName: item.clientName || "",

        clientEmail: item.clientEmail || "",

        createdAt: formatDisplayDateTime(item.createdAt || item.date),

        source: item.source || "sheet",
      }));

      /*
       * Mostrar primero las citas
       * registradas más recientemente.
       */
      remoteAppointments.reverse();

      /*
       * Primera página = citas más nuevas.
       */
      agendaPage = 1;

      remoteAppointmentsLoaded = true;

      appointmentsLoadedAt = Date.now();

      console.log(
        `Agenda cargada correctamente: ${remoteAppointments.length} cita(s).`,
      );

      return remoteAppointments;
    } catch (error) {
      console.error("Error cargando agenda desde Google Sheets:", error);

      /*
       * Si ya teníamos datos cargados,
       * conservarlos.
       */
      return remoteAppointments;
    }
  })();

  try {
    return await appointmentsLoadingPromise;
  } finally {
    appointmentsLoadingPromise = null;
  }
};

//Función para enviar la cita a Google Sheets
const sendAppointmentToGoogleSheets = async (appointment) => {
  if (!APPOINTMENT_ENDPOINT) {
    return {
      success: false,
      error: "Endpoint de citas no configurado.",
    };
  }

  const params = new URLSearchParams({
    action: "saveAppointment",

    ...appointment,

    source: "tarjeta",

    _: String(Date.now()),
  });

  const url = `${APPOINTMENT_ENDPOINT}?${params.toString()}`;

  try {
    const result = await requestAppsScript(url, {
      retries: 2,
      timeout: 30000,
      useFetchFirst: false,
    });

    console.log("Respuesta guardar cita:", result);

    if (!result) {
      return {
        success: false,
        error: "El servidor no devolvió una respuesta válida.",
      };
    }

    /*
     * IMPORTANTE:
     *
     * Devolvemos el OBJETO completo.
     *
     * Ejemplo:
     * {
     *   success: true,
     *   duplicate: false,
     *   id: "..."
     * }
     */
    return result;
  } catch (error) {
    console.error("Error guardando cita:", error);

    return {
      success: false,
      error: "No fue posible comunicarse con el servidor.",
    };
  }
};

//función saveOpinion
const sendOpinionToGoogleSheets = async (opinion) => {
  if (!APPOINTMENT_ENDPOINT) {
    return {
      success: false,
      error: "Endpoint no configurado",
    };
  }

  const params = new URLSearchParams({
    action: "saveOpinion",

    id: String(opinion.id),

    name: opinion.name,

    service: opinion.service,

    rating: String(opinion.rating),

    comment: opinion.comment,

    createdAt: opinion.createdAt,

    _: String(Date.now()),
  });

  const url = `${APPOINTMENT_ENDPOINT}` + `?${params.toString()}`;

  console.log("Guardando opinión:", url);

  try {
    /*
     * IMPORTANTE:
     *
     * El mismo ID viaja en todos los
     * reintentos.
     *
     * Tu Apps Script debe impedir
     * duplicados por ese ID.
     */
    const result = await requestAppsScript(url, {
      retries: 3,
      timeout: 30000,
      useFetchFirst: true,
    });

    if (!result || result.success !== true) {
      return {
        success: false,

        error: result?.error || "No fue posible guardar la opinión.",
      };
    }

    return result;
  } catch (error) {
    console.error("Error definitivo guardando opinión:", error);

    return {
      success: false,

      error: "No fue posible comunicarse con el servidor. Intenta nuevamente.",
    };
  }
};

//Mensaje de opiniones
const showOpinionFeedback = (message, isError = false) => {
  const existing = document.getElementById("opinion-feedback");

  if (existing) {
    existing.remove();
  }

  const feedback = document.createElement("div");

  feedback.id = "opinion-feedback";

  feedback.style.cssText = `
        position: fixed;
        bottom: 1rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        font-size: 0.95rem;
        font-weight: 600;
        color: #fff;
        max-width: 90vw;
        text-align: center;
    `;

  feedback.style.backgroundColor = isError ? "#dc2626" : "#16a34a";

  feedback.textContent = message;

  document.body.appendChild(feedback);

  setTimeout(() => {
    if (feedback) {
      feedback.remove();
    }
  }, 4000);
};

//Función que procesa el botón: Enviar opinión
const handleSubmitOpinion = async () => {
  // Protección adicional contra doble clic
  if (opinionSending) {
    console.warn("Ya existe una opinión en proceso de envío.");

    return;
  }

  const nameInput = document.getElementById("opinion-name");

  const serviceInput = document.getElementById("opinion-service");

  const commentInput = document.getElementById("opinion-comment");

  const submitBtn = document.getElementById("submit-opinion-btn");

  const starsContainer = document.getElementById("opinion-stars");

  if (
    !nameInput ||
    !serviceInput ||
    !commentInput ||
    !submitBtn ||
    !starsContainer
  ) {
    console.error("No se encontraron todos los elementos del formulario.");

    return;
  }

  const name = nameInput.value.trim();
  const service = serviceInput.value.trim();
  const comment = commentInput.value.trim();

  const rating = Number(starsContainer.dataset.rating || 0);

  // -------------------------
  // VALIDACIONES
  // -------------------------

  if (!name) {
    markFieldError(nameInput, "Por favor ingresa tu nombre.");

    return;
  }

  if (!service) {
    markFieldError(serviceInput, "Selecciona el servicio realizado.");

    return;
  }

  if (!rating) {
    showOpinionFeedback(
      "Por favor selecciona una calificación de 1 a 5 estrellas.",
      true,
    );

    return;
  }

  if (!comment) {
    markFieldError(commentInput, "Por favor escribe tu comentario.");

    return;
  }

  // -------------------------
  // BLOQUEAR ENVÍO
  // -------------------------

  opinionSending = true;

  submitBtn.disabled = true;

  submitBtn.style.pointerEvents = "none";

  submitBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin mr-2"></i> Guardando opinión...';

  /*
   * ID creado una sola vez.
   *
   * Este mismo ID debe ser utilizado por
   * Apps Script para impedir duplicados.
   */
  const opinion = {
    id: Date.now() + "-" + Math.random().toString(36).substring(2, 10),

    name,
    service,
    rating,
    comment,

    createdAt: new Date().toISOString(),
  };

  try {
    const result = await sendOpinionToGoogleSheets(opinion);

    if (!result.success) {
      showOpinionFeedback(
        result.error ||
          "No fue posible guardar tu opinión. Inténtalo nuevamente.",
        true,
      );

      return;
    }

    // -------------------------
    // GUARDADO CONFIRMADO
    // -------------------------

    showOpinionFeedback(
      result.duplicate
        ? "Esta opinión ya había sido registrada."
        : "¡Gracias! Tu opinión fue registrada correctamente.",
    );

    // Limpiar formulario solamente
    // cuando Apps Script confirmó el guardado.

    nameInput.value = "";
    serviceInput.value = "";
    commentInput.value = "";

    starsContainer.dataset.rating = "0";

    document.querySelectorAll("#opinion-stars button").forEach((button) => {
      button.dataset.selected = "false";

      button.classList.remove("text-[#ee9b00]");

      button.classList.add("text-gray-300");
    });

    // -------------------------
    // ACTUALIZAR OPINIONES
    // -------------------------

    const lista = document.getElementById("opiniones-list");

    if (lista) {
      lista.innerHTML = `
        <p class="text-sm text-gray-500 text-center py-4">
          Actualizando opiniones...
        </p>
      `;

      await fetchOpinionesFromSheet(true);

      renderOpinionesPaginationList(lista);
    }
  } catch (error) {
    console.error("Error procesando opinión:", error);

    showOpinionFeedback("Ocurrió un error al enviar la opinión.", true);
  } finally {
    opinionSending = false;

    submitBtn.disabled = false;

    submitBtn.style.pointerEvents = "";

    submitBtn.innerHTML =
      '<i class="fas fa-paper-plane mr-2"></i> Enviar opinión';
  }
};

//Ejecuta handleSubmitOpinion().
const submitOpinionBtn = document.getElementById("submit-opinion-btn");

if (submitOpinionBtn) {
  submitOpinionBtn.addEventListener("click", handleSubmitOpinion);
}

const initOpinionStars = () => {
  const starsContainer = document.getElementById("opinion-stars");

  if (!starsContainer) return;

  const stars = starsContainer.querySelectorAll("button[data-rating]");

  stars.forEach((star) => {
    star.addEventListener("click", () => {
      const rating = Number(star.dataset.rating);

      // Guardar la calificación seleccionada
      starsContainer.dataset.rating = String(rating);

      // Pintar las estrellas seleccionadas
      stars.forEach((item) => {
        const itemRating = Number(item.dataset.rating);

        if (itemRating <= rating) {
          item.classList.remove("text-gray-300");
          item.classList.add("text-[#ee9b00]");
        } else {
          item.classList.remove("text-[#ee9b00]");
          item.classList.add("text-gray-300");
        }
      });
    });
  });
};

// Inicializar las estrellas
initOpinionStars();

//Función para mostrar mensajes al usuario
const showMessage = (message, type = "success", duration = 3000) => {
  const existing = document.getElementById("app-message");

  if (existing) {
    existing.remove();
  }

  const div = document.createElement("div");

  div.id = "app-message";

  div.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;

    min-width: 320px;
    max-width: 90%;

    padding: 15px 20px;

    border-radius: 12px;

    color: #fff;

    font-weight: 600;

    text-align: center;

    box-shadow:
      0 8px 25px rgba(0,0,0,.25);

    transition: .3s;
  `;

  switch (type) {
    case "error":
      div.style.background = "#dc2626";
      break;

    case "warning":
      div.style.background = "#d97706";
      break;

    case "info":
      div.style.background = "#2563eb";
      break;

    default:
      div.style.background = "#16a34a";
  }

  div.textContent = message;

  document.body.appendChild(div);

  /*
   * duration = 0
   * significa:
   *
   * mantener el mensaje hasta que
   * otro showMessage() lo reemplace.
   */
  if (duration > 0) {
    setTimeout(() => {
      if (div.parentNode) {
        div.remove();
      }
    }, duration);
  }
};

//Función especial para verificar la eliminación
const verifyAppointmentExistsOnServer = async (appointmentId) => {
  if (!APPOINTMENT_ENDPOINT) {
    return null;
  }

  const params = new URLSearchParams({
    action: "getAppointments",

    _: String(Date.now()),
  });

  const url = `${APPOINTMENT_ENDPOINT}?${params.toString()}`;

  try {
    /*
     * Una consulta corta y directa.
     *
     * NO utilizamos la caché local.
     */
    const result = await requestAppsScript(url, {
      retries: 1,
      timeout: 10000,
      useFetchFirst: false,
    });

    if (
      !result ||
      result.success !== true ||
      !Array.isArray(result.appointments)
    ) {
      return null;
    }

    const exists = result.appointments.some(
      (item) => String(item.id) === String(appointmentId),
    );

    return exists;
  } catch (error) {
    console.warn("No fue posible verificar la cita:", error);

    /*
     * null significa:
     * no pudimos determinarlo.
     */
    return null;
  }
};

//Función àra borrar una cita agendada teniendo en cuenta localStorage o desde la URL
const deleteAppointment = async (appointmentId, providedDeleteToken = "") => {
  if (!APPOINTMENT_ENDPOINT) {
    showMessage("No hay endpoint configurado.", "error");

    return false;
  }

  if (!appointmentId) {
    showMessage("Identificador de cita inválido.", "error");

    return false;
  }

  // =========================================
  // TOKEN
  // =========================================

  const deleteToken =
    String(providedDeleteToken || "").trim() ||
    getAppointmentDeleteToken(appointmentId);

  if (!deleteToken) {
    showMessage("No tienes autorización para eliminar esta cita.", "error");

    return false;
  }

  const params = new URLSearchParams({
    action: "deleteAppointment",

    id: String(appointmentId),

    deleteToken: String(deleteToken),

    _: String(Date.now()),
  });

  const requestUrl = `${APPOINTMENT_ENDPOINT}?${params.toString()}`;

  /*
   * Mensaje permanente mientras
   * estamos procesando.
   */
  showMessage("Eliminando tu cita. Por favor espera...", "warning", 0);

  try {
    /*
     * IMPORTANTE:
     *
     * Para eliminar NO hacemos varios
     * reintentos automáticos.
     *
     * La primera solicitud podría haber
     * eliminado la fila aunque la respuesta
     * JSONP no vuelva.
     */
    const result = await requestAppsScript(requestUrl, {
      retries: 1,
      timeout: 10000,
      useFetchFirst: false,
    });

    console.log("Respuesta eliminar cita:", result);

    if (result && result.success === true) {
      // ================================
      // ELIMINACIÓN CONFIRMADA
      // ================================

      removeAppointmentDeleteToken(appointmentId);

      /*
       * Quitar inmediatamente de la
       * memoria local.
       *
       * No esperamos otra consulta.
       */
      remoteAppointments = remoteAppointments.filter(
        (item) => String(item.id) !== String(appointmentId),
      );

      remoteAppointmentsLoaded = true;

      appointmentsLoadedAt = Date.now();

      showMessage("Tu cita fue eliminada correctamente.", "success", 5000);

      return true;
    }

    /*
     * Si Apps Script contestó expresamente
     * con un error, comprobamos igualmente
     * si la cita todavía existe.
     */
    showMessage("Verificando la eliminación...", "info", 0);
  } catch (error) {
    /*
     * MUY IMPORTANTE:
     *
     * Un timeout NO significa necesariamente
     * que Apps Script no ejecutó la operación.
     *
     * Tu captura demuestra exactamente esto:
     * Sheets borró la fila aunque JSONP falló.
     */
    console.warn("No llegó la confirmación de eliminación:", error);

    showMessage(
      "La solicitud fue enviada. Verificando si la cita fue eliminada...",
      "info",
      0,
    );
  }

  // =========================================
  // VERIFICAR EL ESTADO REAL
  // =========================================

  const stillExists = await verifyAppointmentExistsOnServer(appointmentId);

  // =========================================
  // YA NO EXISTE
  // =========================================

  if (stillExists === false) {
    console.log("La cita ya no existe en Google Sheets.");

    removeAppointmentDeleteToken(appointmentId);

    /*
     * Eliminar también de la memoria local.
     */
    remoteAppointments = remoteAppointments.filter(
      (item) => String(item.id) !== String(appointmentId),
    );

    remoteAppointmentsLoaded = true;

    appointmentsLoadedAt = Date.now();

    showMessage("Tu cita fue eliminada correctamente.", "success", 5000);

    return true;
  }

  // =========================================
  // TODAVÍA EXISTE
  // =========================================

  if (stillExists === true) {
    showMessage(
      "No fue posible eliminar la cita. Inténtalo nuevamente.",
      "error",
      5000,
    );

    return false;
  }

  // =========================================
  // GOOGLE TAMPOCO RESPONDIÓ AL VERIFICAR
  // =========================================

  showMessage(
    "No pudimos confirmar el resultado. Actualiza la agenda en unos segundos.",
    "warning",
    6000,
  );

  return false;
};

//Funcion para cancelar la cita desde la URL
const handleAppointmentCancellationFromUrl = async () => {
  const urlParams = new URLSearchParams(window.location.search);

  const appointmentId = String(urlParams.get("cancelAppointment") || "").trim();

  const deleteToken = String(urlParams.get("token") || "").trim();

  // =========================================
  // NO ES UN ENLACE DE CANCELACIÓN
  // =========================================

  if (!appointmentId || !deleteToken) {
    return;
  }

  console.log("Solicitud de cancelación detectada:", appointmentId);

  // =========================================
  // CONFIRMACIÓN DEL USUARIO
  // =========================================

  const confirmed = window.confirm("¿Deseas cancelar esta cita?");

  if (!confirmed) {
    /*
     * Quitamos los parámetros sensibles
     * de la barra del navegador.
     */
    cleanAppointmentCancellationUrl();

    return;
  }

  // =========================================
  // CANCELAR
  // =========================================

  const success = await deleteAppointment(appointmentId, deleteToken);

  // =========================================
  // LIMPIAR URL
  // =========================================

  cleanAppointmentCancellationUrl();

  if (success) {
    /*
     * Actualizar agenda local.
     */
    try {
      await fetchAppointmentsFromSheet(true);
    } catch (error) {
      console.warn(
        "No se pudo actualizar la agenda después de cancelar:",
        error,
      );
    }

    showCancellationSuccessModal();
  }
};

//Función para limpiar el token de la URL
const cleanAppointmentCancellationUrl = () => {
  try {
    const cleanUrl = window.location.origin + window.location.pathname;

    window.history.replaceState({}, document.title, cleanUrl);
  } catch (error) {
    console.warn("No fue posible limpiar la URL:", error);
  }
};

//Función para mostrar el modal de éxito al cancelar una cita
const showCancellationSuccessModal = () => {
  if (!agendarModal) {
    showMessage("Tu cita fue cancelada correctamente.", "success");

    return;
  }

  const modalContent = agendarModal.querySelector(".modal-content");

  if (!modalContent) {
    showMessage("Tu cita fue cancelada correctamente.", "success");

    return;
  }

  modalContent.innerHTML = `

      <div
        class="modal-body text-center p-8"
      >

        <div
          class="text-7xl text-green-500 mb-4"
        >
          <i
            class="fas fa-check-circle"
          ></i>
        </div>

        <h2
          class="text-2xl font-bold text-[#005f73] mb-3"
        >
          Cita Cancelada
        </h2>

        <p
          class="text-gray-600"
        >
          Tu cita fue cancelada correctamente.
        </p>

        <p
          class="text-sm text-gray-500 mt-3"
        >
          El horario nuevamente está disponible
          para agendamiento.
        </p>

        <button
          id="cancel-success-close-btn"
          type="button"
          class="mt-6 w-full py-3 bg-[#005f73] text-white font-bold rounded-lg hover:bg-[#0a9396] transition"
        >
          Cerrar
        </button>

      </div>
    `;

  agendarModal.classList.add("active");

  const closeBtn = document.getElementById("cancel-success-close-btn");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      agendarModal.classList.remove("active");
    });
  }
};

//Lógica para cuando llegue el botón de cancelar la cita
document.addEventListener("DOMContentLoaded", () => {
  handleAppointmentCancellationFromUrl();
});

const renderAgendaList = (containerEl) => {
  if (!containerEl) return;

  if (!remoteAppointmentsLoaded) {
    containerEl.innerHTML =
      '<p class="text-sm text-gray-500">Cargando citas desde Google Sheets...</p>';
    return;
  }

  if (!remoteAppointments.length) {
    containerEl.innerHTML =
      '<p class="text-sm text-gray-500">Aún no hay citas agendadas en Google Sheets.</p>';
    return;
  }

  // Calcular cantidad total de páginas
  const totalPages = Math.ceil(
    remoteAppointments.length / APPOINTMENTS_PER_PAGE,
  );

  // Evitar que agendaPage quede fuera de rango
  if (agendaPage > totalPages) {
    agendaPage = totalPages;
  }

  if (agendaPage < 1) {
    agendaPage = 1;
  }

  // Calcular desde qué cita mostrar
  const start = (agendaPage - 1) * APPOINTMENTS_PER_PAGE;

  const end = start + APPOINTMENTS_PER_PAGE;

  // Solo las citas de la página actual
  const appointmentsPagina = remoteAppointments.slice(start, end);

  containerEl.innerHTML = appointmentsPagina
    .map((appointment) => {
      const dateLabel = formatDisplayDate(appointment.date);

      // Solo el navegador que creó la cita
      // tendrá este token.
      const isOwnAppointment = Boolean(
        getAppointmentDeleteToken(appointment.id),
      );

      const ownerActions = isOwnAppointment
        ? `
        <div class="mt-3 flex items-center justify-between gap-3">

          <span
            class="text-xs font-semibold text-green-600"
          >
            <i class="fas fa-check-circle mr-1"></i>
            Tu cita
          </span>

          <button
            class="delete-appointment-btn text-xs text-red-600 hover:underline font-semibold"
            data-id="${appointment.id}"
          >
            <i class="fas fa-trash-alt mr-1"></i>
            Eliminar mi cita
          </button>

        </div>
      `
        : "";

      return `
    <div
      class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-left"
    >

      <div
        class="font-semibold text-[#005f73]"
      >
        ${dateLabel}
      </div>

      <div
        class="text-sm text-gray-600 mt-1"
      >
        Hora:
        ${normalizeTime(appointment.time)}
      </div>

      <div
        class="text-xs text-gray-400 mt-1"
      >
        Guardada:
        ${appointment.createdAt}
      </div>

      ${ownerActions}

    </div>
  `;
    })
    .join("");

  // ========================================
  // PAGINACIÓN DE LA AGENDA
  // ========================================

  if (totalPages > 1) {
    containerEl.insertAdjacentHTML(
      "beforeend",
      `
      <div
        class="agenda-pagination flex items-center justify-between gap-3 pt-3 mt-3 border-t border-gray-200"
      >

        <button
          type="button"
          class="agenda-prev-btn px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold
          ${
            agendaPage === 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-[#005f73] hover:bg-gray-100"
          }"
          ${agendaPage === 1 ? "disabled" : ""}
        >
          ← Anterior
        </button>

        <span
          class="text-xs sm:text-sm font-semibold text-gray-600 whitespace-nowrap"
        >
          Página ${agendaPage} de ${totalPages}
        </span>

        <button
          type="button"
          class="agenda-next-btn px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold
          ${
            agendaPage === totalPages
              ? "text-gray-300 cursor-not-allowed"
              : "text-[#005f73] hover:bg-gray-100"
          }"
          ${agendaPage === totalPages ? "disabled" : ""}
        >
          Siguiente →
        </button>

      </div>
    `,
    );
  }

  // ========================================
  // EVENTOS DE PAGINACIÓN
  // ========================================

  const agendaPrevBtn = containerEl.querySelector(".agenda-prev-btn");

  const agendaNextBtn = containerEl.querySelector(".agenda-next-btn");

  if (agendaPrevBtn) {
    agendaPrevBtn.addEventListener("click", () => {
      if (agendaPage <= 1) {
        return;
      }

      agendaPage--;

      renderAgendaList(containerEl);
    });
  }

  if (agendaNextBtn) {
    agendaNextBtn.addEventListener("click", () => {
      if (agendaPage >= totalPages) {
        return;
      }

      agendaPage++;

      renderAgendaList(containerEl);
    });
  }

  containerEl.querySelectorAll(".delete-appointment-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const appointmentId = button.dataset.id;

      if (!appointmentId) {
        return;
      }

      const confirmed = confirm("¿Deseas eliminar esta cita de la agenda?");

      if (!confirmed) {
        return;
      }

      // ==========================
      // BLOQUEAR BOTÓN
      // ==========================

      button.disabled = true;

      button.style.pointerEvents = "none";

      const textoOriginal = button.innerHTML;

      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

      try {
        const success = await deleteAppointment(appointmentId);

        if (success) {
          /*
           * deleteAppointment() ya eliminó
           * la cita de remoteAppointments.
           *
           * Por eso actualizamos la vista
           * INMEDIATAMENTE.
           */
          renderAgendaList(containerEl);

          /*
           * Sin bloquear la interfaz,
           * intentamos sincronizar otra vez
           * con Google en segundo plano.
           */
          fetchAppointmentsFromSheet(true)
            .then(() => {
              renderAgendaList(containerEl);
            })
            .catch((error) => {
              console.warn(
                "No fue posible refrescar la agenda después de eliminar:",
                error,
              );
            });

          return;
        }

        // ==========================
        // NO SE PUDO CONFIRMAR
        // ==========================

        button.disabled = false;

        button.style.pointerEvents = "";

        button.innerHTML = textoOriginal;
      } catch (error) {
        console.error("Error procesando eliminación:", error);

        showMessage("Ocurrió un error eliminando la cita.", "error", 5000);

        button.disabled = false;

        button.style.pointerEvents = "";

        button.innerHTML = textoOriginal;
      }
    });
  });
};

//modal de agendamiento de citas
const openAgendarModal = async () => {
  const modalContentEl = agendarModal.querySelector(".modal-content");
  modalContentEl.innerHTML = `
                <div class="modal-header">
                    <h2 id="agendar-title" class="modal-header-title">Selecciona una Fecha</h2>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="calendar-view">
                        <div class="flex items-center justify-between mb-4">
                            <button id="prev-month-btn" class="text-gray-600 hover:text-[#005f73] text-2xl p-2 rounded-full leading-none">&larr;</button>
                            <h3 id="month-year" class="text-lg font-semibold text-gray-700"></h3>
                            <button id="next-month-btn" class="text-gray-600 hover:text-[#005f73] text-2xl p-2 rounded-full leading-none">&rarr;</button>
                        </div>
                        <div class="grid grid-cols-7 gap-2 text-center text-sm text-gray-400 font-bold mb-2">
                            <div>Do</div><div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div>
                        </div>
                        <div id="calendar-days" class="grid grid-cols-7 gap-2 text-center"></div>
                        <div class="mt-4 border-t border-gray-200 pt-4">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-sm font-semibold text-gray-700">Agenda</h4>
                                <button id="refresh-agenda-btn" class="text-xs text-[#005f73] hover:underline">Actualizar</button>
                            </div>
                            <div id="agenda-list" class="space-y-2"></div>
                        </div>
                    </div>
                    <div id="time-view" class="hidden">
                        <button id="back-to-calendar-btn" class="text-sm text-[#005f73] hover:underline mb-4 font-semibold">&larr; Volver al calendario</button>
                        <p id="selected-date-text" class="text-center text-gray-600 mb-4 font-semibold"></p>
                        <div class="space-y-4 mb-4">
                            <div>
                                <label for="client-name-input" class="block text-sm font-semibold mb-2">Tu nombre *</label>
                                <input id="client-name-input" type="text" placeholder="Ingresa tu nombre" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005f73]" />
                            </div>
                            <div>
                                <label for="client-email-input" class="block text-sm font-semibold mb-2">Tu correo *</label>
                                <input id="client-email-input" type="email" placeholder="correo@ejemplo.com" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005f73]" />
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-2">
                                    Descripción de la cita *
                                </label>

                                <textarea
                                    id="appointment-description"
                                    rows="4"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005f73]"
                                    placeholder="Describe brevemente el motivo de la cita..."
                                    required></textarea>
                            </div>
                        </div>
                        <div id="time-slots" class="grid grid-cols-3 sm:grid-cols-4 gap-3"></div>
                        <button id="confirm-appointment-btn" class="w-full mt-6 py-3 bg-[#ee9b00] text-white font-bold rounded-lg hover:bg-amber-500 transition disabled:bg-gray-400 disabled:cursor-not-allowed" disabled>Confirmar Cita</button>
                    </div>
                </div>
            `;
  initAppointmentValidation();
  // Re-bind elements
  modalContentEl
    .querySelector(".modal-close-btn")
    .addEventListener("click", closeAgendarModal);
  document.getElementById("prev-month-btn").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("next-month-btn").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  document
    .getElementById("back-to-calendar-btn")
    .addEventListener("click", resetAppointmentView);
  document
    .getElementById("confirm-appointment-btn")
    .addEventListener("click", () => confirmAppointment());
  document
    .getElementById("refresh-agenda-btn")
    .addEventListener("click", async () => {
      const refreshBtn = document.getElementById("refresh-agenda-btn");

      const lista = document.getElementById("agenda-list");

      if (!lista) return;

      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = "Actualizando...";
      }

      try {
        await fetchAppointmentsFromSheet(true);

        renderAgendaList(lista);
      } finally {
        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.textContent = "Actualizar";
        }
      }
    });

  agendarModal.classList.add("active");
  resetAppointmentView();
  renderCalendar();
  const agendaList = document.getElementById("agenda-list");
  if (agendaList) {
    agendaList.innerHTML =
      '<p class="text-sm text-gray-500">Cargando citas desde Google Sheets...</p>';
  }
  await fetchAppointmentsFromSheet(false);
  renderAgendaList(document.getElementById("agenda-list"));
};

const closeAgendarModal = () => {
  agendarModal.classList.remove("active");

  selectedDate = null;
  selectedTime = null;

  /*
   * La próxima vez que se abra
   * la agenda, comenzar por las
   * citas más recientes.
   */
  agendaPage = 1;
};

const renderCalendar = () => {
  currentDate.setDate(1); // Evita problemas con meses de diferente longitud
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  document.getElementById("month-year").textContent = new Date(year, month)
    .toLocaleString("es-ES", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());

  const calendarDaysEl = document.getElementById("calendar-days");
  calendarDaysEl.innerHTML = "";

  const firstDayOfMonth = currentDate.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayTimestamp = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();

  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDaysEl.insertAdjacentHTML("beforeend", "<div></div>");
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement("div");
    dayEl.textContent = day;
    dayEl.classList.add(
      "calendar-day",
      "h-10",
      "w-10",
      "flex",
      "items-center",
      "justify-center",
      "cursor-pointer",
      "rounded-full",
    );

    const dayDate = new Date(year, month, day);
    const dayOfWeek = dayDate.getDay();

    if (dayDate.getTime() < todayTimestamp || dayOfWeek === 0) {
      // Disable past days and Sundays
      dayEl.classList.add("disabled");
    } else {
      dayEl.addEventListener("click", () => selectDate(dayDate));
    }

    if (dayDate.toDateString() === today.toDateString()) {
      dayEl.classList.add("today");
    }

    if (
      selectedDate &&
      dayDate.toDateString() === selectedDate.toDateString()
    ) {
      dayEl.classList.add("selected");
    }

    calendarDaysEl.appendChild(dayEl);
  }
};

const selectDate = (date) => {
  selectedDate = date;
  renderCalendar();
  showTimeView();
};

const showTimeView = () => {
  document.getElementById("calendar-view").classList.add("hidden");
  document.getElementById("time-view").classList.remove("hidden");
  document.getElementById("agendar-title").textContent = "Selecciona una Hora";
  document.getElementById("selected-date-text").textContent =
    selectedDate.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  renderTimeSlots();
};

const renderTimeSlots = () => {
  const timeSlotsContainerEl = document.getElementById("time-slots");
  timeSlotsContainerEl.innerHTML = "";
  selectedTime = null;
  document.getElementById("confirm-appointment-btn").disabled = true;

  let availableTimes = [];
  const dayOfWeek = selectedDate.getDay();

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // Lunes a Viernes
    availableTimes = [
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00"
    ];
  } else if (dayOfWeek === 6) {
    // Sábado
    availableTimes = ["10:00", "11:00", "15:00","16:00", "17:00"];
  }

  if (availableTimes.length === 0) {
    timeSlotsContainerEl.innerHTML =
      '<p class="col-span-full text-center text-gray-500">No hay horarios disponibles.</p>';
    return;
  }

  availableTimes.forEach((time) => {
    const timeSlotEl = document.createElement("div");
    timeSlotEl.textContent = time;
    timeSlotEl.classList.add(
      "time-slot",
      "p-2",
      "rounded-lg",
      "text-center",
      "cursor-pointer",
      "font-mono",
    );

    if (isTimeSlotTaken(selectedDate, time)) {
      timeSlotEl.classList.add(
        "opacity-50",
        "cursor-not-allowed",
        "bg-gray-200",
        "text-gray-500",
      );
      timeSlotEl.title = "Este horario ya está reservado";
    } else {
      timeSlotEl.addEventListener("click", () => {
        document
          .querySelectorAll(".time-slot")
          .forEach((el) => el.classList.remove("selected"));
        timeSlotEl.classList.add("selected");
        selectedTime = time;
        document.getElementById("confirm-appointment-btn").disabled = false;
      });
    }

    timeSlotsContainerEl.appendChild(timeSlotEl);
  });
};

const resetAppointmentView = () => {
  document.getElementById("time-view").classList.add("hidden");
  document.getElementById("calendar-view").classList.remove("hidden");
  document.getElementById("agendar-title").textContent = "Selecciona una Fecha";
  selectedDate = null;
  selectedTime = null;
};

const confirmAppointment = async () => {
  // =========================================
  // EVITAR DOBLE CLIC / DOBLE ENVÍO
  // =========================================

  if (appointmentSending) {
    console.warn("Ya existe una cita en proceso de envío.");

    return;
  }

  appointmentSending = true;

  let confirmBtn = null;

  try {
    confirmBtn = document.getElementById("confirm-appointment-btn");

    if (!confirmBtn) {
      return;
    }

    if (confirmBtn.disabled) {
      return;
    }

    confirmBtn.disabled = true;
    confirmBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    // =========================================
    // VALIDAR FECHA Y HORA
    // =========================================

    if (!selectedDate || !selectedTime) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Confirmar Cita";

      return;
    }

    if (isTimeSlotTaken(selectedDate, selectedTime)) {
      showMessage(
        "Este horario ya está asignado. Por favor elige otro.",
        "info",
      );
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Confirmar Cita";
      return;
    }

    // =========================================
    // OBTENER CAMPOS
    // =========================================

    const nameInput = document.getElementById("client-name-input");
    const emailInput = document.getElementById("client-email-input");
    const descriptionInput = document.getElementById("appointment-description");
    const appointmentDescription = descriptionInput
      ? descriptionInput.value.trim()
      : "";
    clientName = nameInput ? nameInput.value.trim() : "";
    clientEmail = emailInput ? emailInput.value.trim() : "";

    // VALIDAR NOMBRE
    if (!clientName) {
      markFieldError(nameInput, "Por favor ingresa tu nombre para agendar.");

      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Confirmar Cita";

      return;
    }

    // VALIDAR EMAIL
    if (!clientEmail) {
      markFieldError(emailInput, "Por favor ingresa tu email para agendar.");

      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Confirmar Cita";

      return;
    }

    if (!isValidEmail(clientEmail)) {
      markFieldError(
        emailInput,
        "El correo electrónico no tiene un formato válido.",
      );

      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Confirmar Cita";

      return;
    }

    // VALIDAR DESCRIPCIÓN
    if (!appointmentDescription) {
      markFieldError(
        descriptionInput,
        "Debes escribir la descripción de la cita.",
      );

      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Confirmar Cita";

      return;
    }

    // =========================================
    // CREAR CITA
    // =========================================

    const deleteToken = generateAppointmentDeleteToken();

    /*
     * ID único.
     *
     * El backend lo usa para impedir
     * registros duplicados durante
     * reintentos JSONP.
     */

    const appointment = {
      id: Date.now() + "-" + Math.random().toString(36).substring(2, 10),

      date: selectedDate.toISOString(),

      time: selectedTime,

      clientName: clientName,

      clientEmail: clientEmail,

      description: appointmentDescription,

      createdAt: new Date().toISOString(),

      deleteToken: deleteToken,
    };

    // ========================================
    // GUARDAR EN GOOGLE SHEETS
    // ========================================

    const saveResult = await sendAppointmentToGoogleSheets(appointment);

    if (!saveResult || saveResult.success !== true) {
      showMessage(
        saveResult?.error || "No fue posible guardar la cita.",
        "warning",
      );

      confirmBtn.disabled = false;

      confirmBtn.innerHTML = "Confirmar Cita";

      return;
    }

    // ========================================
    // GUARDADO CONFIRMADO
    // ========================================

    /*
     * Guardamos el token para que este
     * navegador pueda cancelar la cita.
     */

    saveAppointmentDeleteToken(appointment.id, appointment.deleteToken);

    /*
     * Actualizar agenda.
     *
     * Esta actualización NO determina
     * si la cita fue guardada.
     * Apps Script ya confirmó el guardado.
     */
    try {
      await fetchAppointmentsFromSheet(true);
    } catch (refreshError) {
      console.warn(
        "La cita se guardó pero la agenda no pudo actualizarse:",
        refreshError,
      );
    }

    // ========================================
    // MODAL DE CONFIRMACIÓN EXITOSA
    // ========================================

    const modalContent = agendarModal.querySelector(".modal-content");

    if (!modalContent) {
      console.error("No se encontró .modal-content");

      showMessage("¡Cita registrada correctamente!", "success");

      return;
    }

    /*
     * Guardar los datos antes de reemplazar
     * el contenido del modal.
     */

    const confirmationDate = selectedDate.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const confirmationTime = selectedTime;

    const confirmationName = clientName;

    const confirmationEmail = clientEmail;

    modalContent.innerHTML = `

      <div
        class="modal-body text-center p-8"
      >

        <div
          class="text-7xl text-green-500 mb-4"
        >
          <i
            class="fas fa-check-circle"
          ></i>
        </div>

        <h2
          class="text-2xl font-bold text-[#005f73] mb-2"
        >
          ¡Cita Confirmada!
        </h2>

        <p
          class="text-gray-600"
        >
          Tu cita está agendada para el
        </p>

        <div
          class="font-semibold text-gray-800 text-lg my-4 bg-gray-100 p-4 rounded-xl"
        >

          <div>
            📅 ${confirmationDate}
          </div>

          <div
            class="mt-2"
          >
            🕘 ${confirmationTime}
          </div>

        </div>

        <div
          class="mt-5 text-left text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-4"
        >

          <p>
            <strong>Nombre:</strong>
            ${escapeHtml(confirmationName)}
          </p>

          <p
            class="mt-2"
          >
            <strong>Correo:</strong>
            ${escapeHtml(confirmationEmail)}
          </p>

        </div>

        <p
          class="text-sm text-green-600 font-semibold mt-5"
        >
          ✓ La cita fue registrada correctamente en Google Sheets.
        </p>

        <p
          class="text-xs text-gray-500 mt-2"
        >
          También recibirás la confirmación en tu correo electrónico.
        </p>

        <div
          class="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left"
        >

          <p
            class="text-sm font-semibold text-[#005f73] mb-2"
          >
            Agenda actual
          </p>

          <div
            id="agenda-summary-list"
            class="space-y-2"
          ></div>

        </div>

        <button
          id="final-close-btn"
          type="button"
          class="mt-6 w-full py-3 bg-[#005f73] text-white font-bold rounded-lg hover:bg-[#0a9396] transition"
        >
          Cerrar
        </button>

      </div>
    `;

    // =========================================
    // MOSTRAR AGENDA EN CONFIRMACIÓN
    // =========================================

    const agendaSummary = document.getElementById("agenda-summary-list");

    if (agendaSummary) {
      renderAgendaList(agendaSummary);
    }

    // =========================================
    // BOTÓN CERRAR
    // =========================================

    const finalCloseBtn = document.getElementById("final-close-btn");

    if (finalCloseBtn) {
      finalCloseBtn.addEventListener("click", closeAgendarModal);
    }

    console.log("Modal de confirmación mostrado correctamente.");
  } catch (error) {
    console.error("Error confirmando cita:", error);

    showMessage("Ocurrió un error inesperado.", "error");

    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Confirmar Cita";
    }
  } finally {
    appointmentSending = false;
  }
};

if (agendarBtn && agendarModal) {
  agendarBtn.addEventListener("click", openAgendarModal);
  /*agendarModal.addEventListener("click", (event) => {
    if (event.target === agendarModal) closeAgendarModal();
  });*/
}

const aiChatBtn = document.getElementById("ai-chat-btn");
const chatModal = document.getElementById("chat-modal");
const chatInput = document.getElementById("chat-input");
const sendChatBtn = document.getElementById("send-chat-btn");
const chatMessages = document.getElementById("chat-messages");

let chatHistory = [];

if (aiChatBtn && chatModal) {
  const openChat = () => {
    chatModal.classList.add("active");
    setTimeout(() => chatInput.focus(), 300);
  };
  const closeChat = () => chatModal.classList.remove("active");
  aiChatBtn.addEventListener("click", openChat);
  chatModal
    .querySelector(".modal-close-btn")
    .addEventListener("click", closeChat);
  chatModal.addEventListener("click", (event) => {
    if (event.target === chatModal) closeChat();
  });
}

const appendMessage = (text, sender) => {
  const msgDiv = document.createElement("div");
  msgDiv.className = `flex items-start gap-3 ${sender === "user" ? "flex-row-reverse" : ""}`;

  // Reemplazar saltos de línea por <br> para un mejor formato visual
  const formattedText = text.replace(/\n/g, "<br>");

  const bubble = document.createElement("div");
  bubble.className = `p-3 rounded-2xl text-sm max-w-[85%] shadow-sm ${
    sender === "user"
      ? "bg-[#e9d8a6] text-[#001219] rounded-tr-none"
      : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"
  }`;
  bubble.innerHTML = formattedText;

  msgDiv.appendChild(bubble);
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const showTyping = () => {
  const msgDiv = document.createElement("div");
  msgDiv.id = "typing-indicator";
  msgDiv.className = `flex items-start gap-3`;
  msgDiv.innerHTML = `
                <div class="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center h-[42px]">
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
                </div>`;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const hideTyping = () => {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
};

const handleSend = async () => {
  const text = chatInput.value.trim();

  if (!text) return;

  appendMessage(text, "user");

  chatInput.value = "";

  showTyping();

  try {
    const systemPrompt = `
      Eres el asistente virtual amigable y profesional del Ing. Sandor Luque Farfán.

      Tu función es orientar a los visitantes de su Tarjeta Digital sobre sus servicios profesionales de Tecnología de la Información.

      SERVICIOS PRINCIPALES:

      💻 Mantenimiento de equipos de cómputo:
      - Diagnóstico de computadores y portátiles.
      - Mantenimiento preventivo y correctivo.
      - Instalación y configuración de sistemas operativos.
      - Optimización de rendimiento.
      - Instalación y configuración de software.
      - Diagnóstico y reemplazo de unidades de almacenamiento.

      🌐 Desarrollo web:
      - Desarrollo de páginas web.
      - Desarrollo web a medida.
      - Sistemas web.
      - Aplicaciones con PHP, Laravel, JavaScript y Vue.js.
      - Integración con bases de datos.
      - Formularios y sistemas de agendamiento.

      🛒 Soluciones digitales:
      - Tiendas online.
      - Tarjetas digitales.
      - Automatización de procesos.
      - Integración con servicios externos.

      📅 AGENDAMIENTO:

      Si el visitante está interesado en contratar un servicio, invítalo de manera natural a utilizar el botón "Agendar Cita" de la Tarjeta Digital.

      REGLAS:

      1. Responde en español.
      2. Sé amable, profesional y conciso.
      3. Utiliza emojis moderadamente.
      4. No inventes precios, servicios, horarios, direcciones o información que no conozcas.
      5. Si no conoces la respuesta, indícalo claramente.
      6. No afirmes que una cita fue creada si el usuario no la ha realizado mediante el sistema de agendamiento.
      7. No solicites contraseñas, claves API ni información confidencial.
      8. Para problemas técnicos complejos, recomienda contactar directamente al Ing. Sandor.
      9. Tu objetivo es orientar al visitante y facilitar que conozca los servicios y agende una cita.
      `;

    chatHistory.push({
      role: "user",
      parts: [
        {
          text: text,
        },
      ],
    });

    const payload = {
      contents: chatHistory,

      systemInstruction: {
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },
    };

    // ==========================================
    // CLOUDFLARE WORKER
    // ==========================================

    const AI_ENDPOINT = "https://sandor-ai.sanditorl1978.workers.dev/";

    const response = await fetch(AI_ENDPOINT, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    const result = await response.json();

    console.log("Respuesta del asistente:", result);

    hideTyping();

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      const reply = result.candidates[0].content.parts[0].text;

      appendMessage(reply, "bot");

      chatHistory.push({
        role: "model",
        parts: [
          {
            text: reply,
          },
        ],
      });
    } else {
      console.error("Respuesta inesperada de Gemini:", result);

      appendMessage(
        "Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías intentarlo nuevamente?",
        "bot",
      );
    }
  } catch (error) {
    console.error("Error al comunicarse con el asistente:", error);

    hideTyping();

    appendMessage(
      "Parece que hay un problema de conexión con el asistente. Inténtalo nuevamente en unos momentos.",
      "bot",
    );
  }
};

sendChatBtn.addEventListener("click", handleSend);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSend();
});

const markFieldError = (control, mensaje) => {
  control.classList.remove("border-gray-300", "focus:ring-[#005f73]");

  control.classList.add("border-red-500", "focus:ring-red-500", "bg-red-50");

  control.focus();

  showMessage(mensaje, "error");
};

const clearFieldError = (control) => {
  control.classList.remove("border-red-500", "focus:ring-red-500", "bg-red-50");

  control.classList.add("border-gray-300", "focus:ring-[#005f73]");
};

const initAppointmentValidation = () => {
  const controls = document.querySelectorAll(
    "#client-name-input,#client-email-input,#appointment-description",
  );

  controls.forEach((control) => {
    control.addEventListener("input", () => {
      clearFieldError(control);
    });
  });
};

const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  return regex.test(email);
};
