# 🐾 PawFinds — Estado Actual del Proyecto

> Documento maestro de continuidad técnica.
> Última actualización: 29 de septiembre de 2026.

---

## 1. ¿Qué es PawFinds?

PawFinds es una plataforma web de rescate y radar para mascotas.

Permite gestionar:

* mascotas perdidas;
* mascotas encontradas;
* avistamientos;
* refugios;
* reportes de la comunidad;
* ubicación mediante mapa;
* moderación de reportes;
* futuras funciones de comunidad, chat, historias y donaciones.

El objetivo es convertir el prototipo actual en una plataforma real, multiusuario, segura y escalable.

---

# 2. Equipo de desarrollo

## Usuario

Responsable de:

* ejecutar cambios en VS Code;
* probar la aplicación;
* comprobar Firebase;
* informar errores;
* decidir qué funcionalidades implementar.

## Gemini

Principal implementador de código.

Responsabilidades:

* modificar el HTML/JavaScript existente;
* implementar las fases indicadas;
* conservar el diseño;
* entregar código completo cuando sea solicitado.

## ChatGPT

Responsabilidades:

* arquitectura;
* revisión del código;
* Firebase;
* Firestore;
* seguridad;
* detección de errores;
* auditoría de cambios;
* validación antes de aplicar modificaciones;
* organización del roadmap.

---

# 3. Método de trabajo

Cada fase debe seguir:

**Construir → revisar → probar → validar → documentar → avanzar.**

Gemini no debe realizar cambios fuera del alcance solicitado.

ChatGPT revisa el código antes de que el usuario lo aplique.

El usuario prueba la implementación real.

---

# 4. Versionado del proyecto

## v0.1 — Prototipo

Estado: COMPLETADO.

Incluye:

* diseño visual;
* mapa Leaflet;
* filtros;
* radar;
* modales;
* autenticación visual;
* panel administrativo visual;
* reportes simulados;
* chat simulado;
* historias;
* donaciones simuladas.

---

## v0.2 — Firebase + Firestore

Estado: COMPLETADO.

Implementado:

* Firebase inicializado.
* Firebase Authentication con Google.
* Firestore.
* colección `alerts`.
* creación real de reportes.
* `addDoc()`.
* `serverTimestamp()`.
* `onSnapshot()`.
* reportes asociados al usuario mediante `userId`.
* estados de reporte.
* actualización de la interfaz en tiempo real.

### Flujo actual

Usuario inicia sesión:

↓

Crea reporte:

↓

Firestore `alerts`

↓

`status: "pending"`

↓

`onSnapshot()`

↓

Interfaz actualizada.

---

# 5. Firebase actual

Proyecto:

`pawfinds-3b0ab`

Firestore:

* Edition: Standard
* Database: `(default)`
* Location: `nam5`

Firebase Authentication:

* Google habilitado.

---

# 6. Colección alerts

Actualmente cada reporte utiliza aproximadamente esta estructura:

```text
alerts/{alertId}

name
type
species
location
lat
lng
image
contact
verified
medical
status
userId
createdAt
```

El `alertId` corresponde al ID generado por Firestore.

---

# 7. Estados actuales de los reportes

Estados previstos:

```text
pending
approved
rejected
```

### pending

Reporte enviado pero todavía no aprobado.

No debe aparecer públicamente.

### approved

Reporte aprobado.

Puede aparecer públicamente en:

* lista;
* mapa;
* radar.

### rejected

Reporte rechazado.

Debe conservarse en Firestore para historial de moderación.

No debe aparecer públicamente.

---

# 8. PASO 3 — Moderación real

Estado:

**EN PROGRESO / PENDIENTE DE REVISIÓN**

Objetivo:

Migrar la moderación del administrador desde `localStorage` hacia Firestore.

### Aprobar

Debe ejecutar:

```text
pending → approved
```

Utilizando Firestore `updateDoc()`.

### Rechazar

Debe ejecutar:

```text
pending → rejected
```

También utilizando `updateDoc()`.

Los documentos rechazados NO deben eliminarse.

---

# 9. Arquitectura de sincronización

`window.alertsData` debe obtener sus datos exclusivamente desde Firestore mediante:

```text
onSnapshot()
```

La interfaz debe reaccionar automáticamente a cambios de Firestore.

No debe utilizar `localStorage` como fuente principal de alertas.

---

# 10. Funcionalidades todavía NO migradas

Estas funcionalidades todavía pueden contener lógica simulada o `localStorage`:

* aprobación/rechazo antiguo;
* resolución de alertas;
* chat;
* historial de chats;
* comentarios;
* historias;
* fotografías;
* audio;
* donaciones;
* GPS;
* perfiles;
* notificaciones.

Esto es intencional mientras avanzamos por fases.

---

# 11. Roadmap

## v0.3 — Moderación

* aprobación real;
* rechazo real;
* historial de moderación.

Estado:

EN PROGRESO.

---

## v0.4 — Seguridad

Pendiente:

* Firestore Security Rules más estrictas;
* protección de operaciones administrativas;
* Firebase Custom Claims;
* eliminación de confianza en comprobaciones únicamente del cliente;
* validación de datos;
* protección de campos sensibles.

---

## v0.5 — GPS real

Pendiente:

* `navigator.geolocation`;
* permisos del navegador;
* ubicación real del usuario;
* actualización del mapa;
* cálculo de distancia real;
* radio de búsqueda real.

Importante:

**No implementar GPS real antes de la fase v0.5.**

---

## v0.6 — Firebase Storage

Pendiente:

* fotografías reales de mascotas;
* imágenes de reportes;
* archivos multimedia;
* reglas de Storage;
* validación de tipos y tamaños.

---

## v0.7 — Usuarios y perfiles

Pendiente:

* perfil de usuario;
* reportes creados por usuario;
* historial;
* mascotas;
* preferencias.

---

## v0.8 — Chat real

Pendiente:

* conversaciones;
* mensajes;
* Firestore;
* archivos;
* fotografías;
* estados de mensajes.

---

## v0.9 — Comunidad

Pendiente:

* comentarios;
* historias de mascotas reunidas;
* interacción comunitaria;
* notificaciones.

---

## v1.0 — Plataforma real

Objetivo final:

PawFinds funcional, segura, multiusuario y preparada para despliegue público.

---

# 12. Diseño

El diseño actual debe conservarse.

Paleta y estilo actuales:

* Navy;
* Coral;
* Violet;
* Mint;
* Cream.

No realizar rediseños generales durante las migraciones técnicas.

Los cambios visuales solamente deben realizarse cuando el usuario los solicite.

---

# 13. Mapa

Tecnología:

Leaflet.

Actualmente utiliza coordenadas de demostración.

La ubicación del usuario NO es GPS real todavía.

No implementar `navigator.geolocation` hasta v0.5.

---

# 14. Datos iniciales

El proyecto originalmente tenía `defaultAlerts`.

Actualmente Firestore es la fuente principal de alertas.

No se deben insertar automáticamente los `defaultAlerts` en Firestore salvo que se decida explícitamente realizar una fase de seed/migración.

---

# 15. localStorage

Todavía existe código heredado relacionado con:

```text
pawfinds_alerts
pawfinds_chats
pawfinds_success_comments
pawfinds_radius
```

No eliminarlo masivamente durante las fases actuales.

Debe migrarse funcionalidad por funcionalidad.

---

# 16. Seguridad administrativa

Actualmente existen mecanismos heredados como:

* `ADMIN_EMAIL`;
* `esAdmin()`;
* PIN administrativo.

Estos mecanismos NO deben considerarse seguridad definitiva.

La seguridad real se implementará posteriormente mediante:

```text
Firebase Authentication
+
Custom Claims
+
Firestore Security Rules
```

No modificar esta arquitectura durante PASO 3 salvo que sea necesario para completar el objetivo específico de la fase.

---

# 17. Reglas actuales de Firestore

Las reglas iniciales actuales permiten:

* lectura pública de `alerts`;
* creación únicamente para usuarios autenticados;
* creación únicamente cuando `userId` coincide con el usuario autenticado;
* creación únicamente con `status == "pending"`;
* actualización y eliminación bloqueadas inicialmente.

La seguridad definitiva se implementará en v0.4.

---

# 18. Prueba real ya realizada

Se creó correctamente un reporte real en Firestore.

El reporte fue almacenado con:

* nombre: Shaira;
* tipo: Perdido;
* especie: shitzu;
* ubicación: la ceja;
* estado: pending;
* usuario autenticado;
* timestamp real;
* coordenadas;
* demás campos del formulario.

Esto confirmó que la conexión frontend → Firebase → Firestore funciona correctamente.

---

# 19. Problemas conocidos / observaciones

### Radar y pines

Al iniciar con `window.alertsData = []`, el mapa puede comenzar sin reportes.

Cuando Firestore recibe un reporte y `onSnapshot()` actualiza los datos, los pines y elementos del radar aparecen.

Esto es comportamiento esperado.

### GPS

Las coordenadas actuales no representan la ubicación GPS real del usuario.

Es una implementación temporal.

### Seguridad

Las reglas actuales son iniciales y no representan la arquitectura final.

### Código heredado

Todavía existe lógica `localStorage` que será eliminada o migrada progresivamente.

---

# 20. Regla para Gemini

Cuando se solicite modificar PawFinds:

1. Trabajar únicamente en la fase indicada.
2. No rediseñar la aplicación.
3. No modificar funcionalidades fuera del alcance.
4. No introducir librerías innecesarias.
5. No duplicar funciones.
6. No eliminar funciones existentes sin autorización.
7. Mantener los IDs HTML existentes.
8. Mantener Firebase modular.
9. Entregar el HTML completo cuando se solicite.
10. Si el HTML supera el límite de mensaje, dividirlo exactamente en dos partes.
11. No usar placeholders.
12. No omitir código.

---

# 21. Regla para ChatGPT

ChatGPT debe revisar cada implementación antes de aplicarla.

La revisión debe clasificar problemas como:

🟢 APROBADO
🟡 OBSERVACIÓN
🔴 PROBLEMA

La revisión debe comprobar:

* lógica;
* Firebase;
* Firestore;
* seguridad;
* compatibilidad;
* regresiones;
* código duplicado;
* funcionalidades fuera de alcance;
* preservación del diseño.

---

# 22. Próximo paso

El siguiente objetivo es completar:

**PASO 3 — Moderación real con Firestore**

La implementación debe limitarse a:

```text
updateDoc()
doc()
aprobarAnuncio()
rechazarAnuncio()
```

Después:

1. Gemini entrega el código.
2. ChatGPT lo audita.
3. Usuario aplica el código.
4. Se prueba en navegador.
5. Se prueba en Firestore.
6. Se valida la moderación.
7. Se actualiza este documento.
8. Se continúa con v0.4.

---

# 23. Principio del proyecto

PawFinds no debe convertirse simplemente en un prototipo visual más grande.

Cada funcionalidad debe pasar progresivamente de:

**simulada → conectada → validada → segura → lista para producción.**

El objetivo es construir una plataforma real.

**🐾 PawFinds**

**Construir → revisar → probar → validar → documentar → avanzar.**
