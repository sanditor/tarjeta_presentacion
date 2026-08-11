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
  const openOpinionesModal = () => {
    opinionesModal.classList.add("active");
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
const APPOINTMENT_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxZdlAAKYfhQyedWgzZL_P_Sv5lEwmfheMiSEtTMiERvM744g3TfZpET6s10OKLtqu9wg/exec";
const OPINIONS_ENDPOINT = APPOINTMENT_ENDPOINT;
let remoteAppointments = [];
let remoteAppointmentsLoaded = false;

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

const loadJsonp = (url, timeoutMs = 15000) => {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonpCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `${url}&callback=${callbackName}`;
    script.onerror = (error) => {
      cleanup();
      reject(new Error("JSONP load error"));
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      if (window[callbackName]) {
        delete window[callbackName];
      }
      script.remove();
    }

    document.body.appendChild(script);
  });
}

/*const loadJsonp = (url, timeoutMs = 30000) => {

    return new Promise((resolve, reject) => {

        const callbackName =
            `jsonpCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

        let finished = false;

        const script = document.createElement("script");

        script.type = "text/javascript";
        script.async = true;

        const cleanup = () => {

            clearTimeout(timeout);

            if (window[callbackName]) {
                delete window[callbackName];
            }

            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };

        const finishSuccess = (data) => {

            if (finished) return;

            finished = true;

            cleanup();

            console.log("JSONP respuesta recibida:", data);

            resolve(data);
        };

        const finishError = (message) => {

            if (finished) return;

            finished = true;

            cleanup();

            reject(new Error(message));
        };

        window[callbackName] = finishSuccess;

        script.src =
            `${url}${url.includes("?") ? "&" : "?"}callback=${callbackName}`;

        script.onerror = () => {

            console.error(
                "Error cargando JSONP:",
                script.src
            );

            finishError("JSONP load error");
        };

        const timeout = setTimeout(() => {

            console.error(
                "JSONP timeout:",
                script.src
            );

            finishError("JSONP timeout");

        }, timeoutMs);

        document.body.appendChild(script);
    });
};*/

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

const fetchAppointmentsFromSheet = async (forceRefresh = false) => {
  if (!APPOINTMENT_ENDPOINT) return [];
  if (remoteAppointmentsLoaded && !forceRefresh) return remoteAppointments;

  const url = `${APPOINTMENT_ENDPOINT}?action=getAppointments&_=${Date.now()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result && Array.isArray(result.appointments)) {
      /*console.log(
              "fetchAppointmentsFromSheet: backend version",
              result.version || "unknown",
            );*/
      remoteAppointments = result.appointments.map((item) => ({
        id: String(item.id || ""),
        date: item.date || "",
        time: normalizeTime(item.time),
        clientName: item.clientName || "",
        clientEmail: item.clientEmail || "",
        createdAt: formatDisplayDateTime(item.createdAt || item.date),
        source: item.source || "sheet",
      }));
      remoteAppointmentsLoaded = true;
    }
  } catch (error) {
    console.warn(
      "fetchAppointmentsFromSheet: fetch CORS falló, usando JSONP",
      error,
    );
    try {
      const result = await loadJsonp(url);
      if (result && Array.isArray(result.appointments)) {
        remoteAppointments = result.appointments.map((item) => ({
          id: String(item.id || ""),
          date: item.date || "",
          time: normalizeTime(item.time),
          clientName: item.clientName || "",
          clientEmail: item.clientEmail || "",
          createdAt: formatDisplayDateTime(item.createdAt || item.date),
          source: item.source || "sheet",
        }));
        remoteAppointmentsLoaded = true;
      }
    } catch (jsonpError) {
      console.error("fetchAppointmentsFromSheet JSONP error:", jsonpError);
    }
  }

  return remoteAppointments;
};

const sendAppointmentToGoogleSheets = async (appointment) => {
  if (!APPOINTMENT_ENDPOINT) return false;

  const params = new URLSearchParams({
    action: "saveAppointment",

    ...appointment,

    source: "tarjeta",
  });

  const url = `${APPOINTMENT_ENDPOINT}?${params.toString()}`;

  try {
    const result = await loadJsonp(url);

    console.log("Guardar cita:", result);

    return result.success === true;
  } catch (error) {
    console.error(error);

    return false;
  }
};

//función saveOpinion
const sendOpinionToGoogleSheets = async (opinion) => {

    if (!OPINIONS_ENDPOINT) {
        console.error("OPINIONS_ENDPOINT no está definido");
        return false;
    }

    const params = new URLSearchParams({
        action: "saveOpinion",
        id: String(opinion.id),
        name: opinion.name,
        service: opinion.service,
        rating: String(opinion.rating),
        comment: opinion.comment,
        createdAt: opinion.createdAt
    });

    const url = `${OPINIONS_ENDPOINT}?${params.toString()}`;

    console.log("Enviando opinión:", url);

    try {

        const response = await fetch(url, {
            method: "GET",
            mode: "no-cors",
            cache: "no-store"
        });

        console.log("Solicitud de opinión enviada correctamente:", response);

        return true;

    } catch (error) {

        console.error("Error enviando opinión:", error);

        return false;
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

    feedback.style.backgroundColor =
        isError ? "#dc2626" : "#16a34a";

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
  const nameInput = document.getElementById("opinion-name");

  const serviceInput = document.getElementById("opinion-service");

  const commentInput = document.getElementById("opinion-comment");

  const submitBtn = document.getElementById("submit-opinion-btn");

  const name = nameInput ? nameInput.value.trim() : "";

  const service = serviceInput ? serviceInput.value.trim() : "";

  const comment = commentInput ? commentInput.value.trim() : "";

  // Calificación seleccionada

  const starsContainer = document.getElementById("opinion-stars");

  const rating = starsContainer
    ? Number(starsContainer.dataset.rating || 0)
    : 0;

  // ----------------------------
  // VALIDAR NOMBRE
  // ----------------------------

  if (!name) {
    markFieldError(nameInput, "Por favor ingresa tu nombre.");

    return;
  }

  // ----------------------------
  // VALIDAR SERVICIO
  // ----------------------------

  if (!service) {
    markFieldError(serviceInput, "Selecciona el servicio realizado.");

    return;
  }

  // ----------------------------
  // VALIDAR ESTRELLAS
  // ----------------------------

  if (!rating) {
    showOpinionFeedback(
      "Por favor selecciona una calificación de 1 a 5 estrellas.",
      true,
    );

    return;
  }

  // ----------------------------
  // VALIDAR COMENTARIO
  // ----------------------------

  if (!comment) {
    markFieldError(commentInput, "Por favor escribe tu comentario.");

    return;
  }

  // ----------------------------
  // DESACTIVAR BOTÓN
  // ----------------------------

  submitBtn.disabled = true;

  submitBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando...';

  const opinion = {
    id: Date.now(),

    name: name,

    service: service,

    rating: rating,

    comment: comment,

    createdAt: new Date().toISOString(),
  };

  try {
    const saved = await sendOpinionToGoogleSheets(opinion);

    if (!saved) {
      showOpinionFeedback(
        "No fue posible guardar tu opinión. Inténtalo nuevamente.",
        true,
      );

      return;
    }

    // ----------------------------
    // ÉXITO
    // ----------------------------

    showOpinionFeedback("¡Gracias! Tu opinión fue registrada correctamente.");

    // Limpiar formulario

    nameInput.value = "";

    serviceInput.value = "";

    commentInput.value = "";

    //Reiniciar calificación
    if (starsContainer) {
      starsContainer.dataset.rating = "0";
    }

    document.querySelectorAll("#opinion-stars button").forEach((button) => {
      button.classList.remove("text-[#ee9b00]");

      button.classList.add("text-gray-300");
    });

    // Quitar selección de estrellas

    document.querySelectorAll("#opinion-stars button").forEach((button) => {
      button.dataset.selected = "false";

      button.classList.remove("text-[#ee9b00]");

      button.classList.add("text-gray-300");
    });
  } catch (error) {
    console.error("Error procesando opinión:", error);

    showDeleteFeedback("Ocurrió un error al enviar la opinión.", true);
  } finally {
    submitBtn.disabled = false;

    submitBtn.innerHTML =
      '<i class="fas fa-paper-plane mr-2"></i> Enviar opinión';
  }
};

//Guarda la estrella seleccionada
const initOpinionStars = () => {
  const starsContainer = document.getElementById("opinion-stars");

  if (!starsContainer) return;

  const stars = starsContainer.querySelectorAll("button[data-rating]");

  stars.forEach((star) => {
    star.addEventListener("click", () => {
      const rating = Number(star.dataset.rating);

      // Guardamos la calificación
      starsContainer.dataset.rating = rating;

      // Pintar estrellas
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

//Ejecuta handleSubmitOpinion().
const submitOpinionBtn = document.getElementById("submit-opinion-btn");

if (submitOpinionBtn) {
  submitOpinionBtn.addEventListener("click", handleSubmitOpinion);
}

initOpinionStars();

const showMessage = (message, type = "success") => {
  const existing = document.getElementById("app-message");

  if (existing) existing.remove();

  const div = document.createElement("div");

  div.id = "app-message";

  div.style.cssText = `
        position:fixed;
        bottom:20px;
        left:50%;
        transform:translateX(-50%);
        z-index:9999;
        min-width:320px;
        max-width:90%;
        padding:15px 20px;
        border-radius:12px;
        color:#fff;
        font-weight:600;
        text-align:center;
        box-shadow:0 8px 25px rgba(0,0,0,.25);
        transition:.3s;
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

  setTimeout(() => {
    div.remove();
  }, 3000);
};

const deleteAppointment = async (appointmentId) => {
  if (!APPOINTMENT_ENDPOINT) {
    console.error("deleteAppointment: APPOINTMENT_ENDPOINT no está definido");
    showMessage("No hay endpoint configurado para eliminar la cita.", "error");
    return false;
  }
  if (!appointmentId) {
    console.error("deleteAppointment: appointmentId inválido", appointmentId);
    showMessage(
      "No se recibió un identificador válido para eliminar.",
      "error",
    );
    return false;
  }

  const requestUrl = `${APPOINTMENT_ENDPOINT}?action=deleteAppointment&id=${encodeURIComponent(appointmentId)}&_=${Date.now()}`;
  console.log("deleteAppointment: enviando solicitud JSONP", requestUrl);
  showMessage("Enviando solicitud de eliminación al backend...", "warning");

  try {
    const result = await loadJsonp(requestUrl);
    console.log("deleteAppointment: result object", result);
    const success = result && result.success === true;

    if (success) {
      showMessage("La cita fue eliminada correctamente.", "success");

      return true;
    }

    showMessage(
      result?.error || "El backend no pudo eliminar la cita.",
      "error",
    );

    return false;
  } catch (error) {
    console.error(error);

    showMessage("Error de conexión con Google Sheets.", "error");

    return false;
  }
};

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

  containerEl.innerHTML = remoteAppointments
    .slice(0, 6)
    .map((appointment) => {
      const dateLabel = formatDisplayDate(appointment.date);
      return `
                    <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-left">
                        <div class="font-semibold text-[#005f73]">${dateLabel}</div>
                        <div class="text-sm text-gray-600 mt-1">Hora: ${normalizeTime(appointment.time)}</div>
                        <div class="text-xs text-gray-400 mt-1">Guardada: ${appointment.createdAt}</div>
                        <div class="mt-3 flex gap-3">
                            <button class="delete-appointment-btn text-xs text-red-600 hover:underline" data-id="${appointment.id}">Eliminar</button>
                        </div>
                    </div>
                `;
    })
    .join("");

  containerEl.querySelectorAll(".delete-appointment-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const appointmentId = button.dataset.id;

      if (!appointmentId) return;

      const confirmed = confirm("¿Deseas eliminar esta cita de la agenda?");

      if (!confirmed) return;

      // Bloquear el botón
      button.disabled = true;

      button.style.pointerEvents = "none";

      const textoOriginal = button.innerHTML;

      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

      try {
        const success = await deleteAppointment(appointmentId);

        if (success) {
          await fetchAppointmentsFromSheet(true);

          renderAgendaList(containerEl);
        } else {
          showMessage("No se pudo eliminar la cita.", "error");

          button.disabled = false;

          button.style.pointerEvents = "";

          button.innerHTML = textoOriginal;
        }
      } catch (error) {
        console.error(error);

        showMessage("Ocurrió un error eliminando la cita.", "error");

        button.disabled = false;

        button.style.pointerEvents = "";

        button.innerHTML = textoOriginal;
      }
    });
  });
};

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
      await fetchAppointmentsFromSheet();
      renderAgendaList(document.getElementById("agenda-list"));
    });

  agendarModal.classList.add("active");
  resetAppointmentView();
  renderCalendar();
  const agendaList = document.getElementById("agenda-list");
  if (agendaList) {
    agendaList.innerHTML =
      '<p class="text-sm text-gray-500">Cargando citas desde Google Sheets...</p>';
  }
  await fetchAppointmentsFromSheet(true);
  renderAgendaList(document.getElementById("agenda-list"));
};

const closeAgendarModal = () => {
  agendarModal.classList.remove("active");
  selectedDate = null;
  selectedTime = null;
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
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ];
  } else if (dayOfWeek === 6) {
    // Sábado
    availableTimes = ["10:00", "11:00", "12:00", "13:00"];
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
  try {
    const confirmBtn = document.getElementById("confirm-appointment-btn");

    if (confirmBtn.disabled) return;

    confirmBtn.disabled = true;
    confirmBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Guardando...';

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

    const nameInput = document.getElementById("client-name-input");
    const emailInput = document.getElementById("client-email-input");
    const descriptionInput = document.getElementById("appointment-description");
    const appointmentDescription = descriptionInput
      ? descriptionInput.value.trim()
      : "";
    clientName = nameInput ? nameInput.value.trim() : "";
    clientEmail = emailInput ? emailInput.value.trim() : "";

    if (!clientName) {
      markFieldError(nameInput, "Por favor ingresa tu nombre para agendar.");

      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Confirmar Cita";

      return;
    }

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

    if (!appointmentDescription) {
      markFieldError(
        descriptionInput,
        "Debes escribir la descripción de la cita.",
      );

      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Confirmar Cita";

      return;
    }

    const appointment = {
      id: Date.now(),
      date: selectedDate.toISOString(),
      time: selectedTime,
      clientName,
      clientEmail,
      description: appointmentDescription,
      createdAt: new Date().toLocaleString("es-ES"),
    };

    const saved = await sendAppointmentToGoogleSheets(appointment);

    if (!saved) {
      showMessage(
        "No fue posible guardar la cita en Google Sheets.",
        "warning",
      );

      confirmBtn.disabled = false;

      confirmBtn.innerHTML = "Confirmar Cita";

      return;
    }

    // Recargar la agenda desde Google Sheets
    await fetchAppointmentsFromSheet(true);

    const citaExiste = remoteAppointments.some(
      (item) => String(item.id) === String(appointment.id),
    );

    if (!citaExiste) {
      showMessage(
        "La cita no apareció en Google Sheets. Intenta nuevamente.",
        "info",
      );

      confirmBtn.disabled = false;
      confirmBtn.innerHTML = "Confirmar Cita";

      return;
    }

    const modalContent = agendarModal.querySelector(".modal-content");
    modalContent.innerHTML = `
                <div class="modal-body text-center p-8">
                    <div class="text-7xl text-green-500 mb-4"><i class="fas fa-check-circle"></i></div>
                    <h2 class="text-2xl font-bold text-[#005f73] mb-2">¡Cita Confirmada!</h2>
                    <p class="text-gray-600">Tu cita está agendada para el</p>
                    <p class="font-semibold text-gray-800 text-lg my-2 bg-gray-100 p-2 rounded-lg">${selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las ${selectedTime}</p>
                    <div class="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
                        <p class="text-sm font-semibold text-[#005f73] mb-2">Agenda actual</p>
                        <div id="agenda-summary-list" class="space-y-2"></div>
                    </div>
                    <div class="mt-4 text-left text-sm text-gray-600">
                        <p><strong>Nombre:</strong> ${clientName}</p>
                        ${clientEmail ? `<p><strong>Correo:</strong> ${clientEmail}</p>` : ""}
                    </div>
                    <p class="text-sm text-gray-500 mt-4">La cita fue registrada correctamente en la agenda de Google Sheets.</p>
                    <button id="final-close-btn" class="mt-6 w-full py-3 bg-[#005f73] text-white font-bold rounded-lg hover:bg-[#0a9396] transition">Cerrar</button>
                </div>`;
    renderAgendaList(document.getElementById("agenda-summary-list"));
    document
      .getElementById("final-close-btn")
      .addEventListener("click", closeAgendarModal);
  } catch (error) {
    console.error(error);

    showMessage("Ocurrió un error inesperado.", "error");

    confirmBtn.disabled = false;
    confirmBtn.innerHTML = "Confirmar Cita";
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
