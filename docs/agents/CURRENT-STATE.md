# PawFinds — estado actual observado

**Fecha de inspección:** 5 de octubre de 2026 (hora local del proyecto).
**Tipo:** fotografía puntual del repositorio. No es una fuente arquitectónica, una certificación funcional ni una auditoría de seguridad.

## Estado de Git

- Rama activa: `multiagent-foundation-docs`.
- `HEAD` al inicio de esta inspección: `64b12d1a4ba63435ea37a83e5c445847ab213bbb` (`docs: establish PawFinds multiagent workflow foundation`).
- La referencia local `master` y `origin/master` apuntaban a `ea05a86e6a4eff236a8fdc51f2cef4b4c3839ff6`; esta rama de trabajo estaba un commit por delante al inicio.
- `docs/agents/` ya estaba versionado por el commit anterior. El working tree estaba limpio al iniciar esta tarea.
- La rama de trabajo no tiene upstream configurado. No se hizo consulta remota para verificar GitHub.
- Remoto configurado: `origin` → `https://github.com/TheJonasM/PawFinds.git`.

## Estado del código observado

- La aplicación está principalmente en `index.html`; también existe `index-backup-before-user-foundation.html`.
- `index.html` contiene Firebase initialization, Firebase Auth con Google, `onAuthStateChanged`, Firestore para Alerts y `syncUserDocument(user)` transaccional en `users/{uid}`.
- La sincronización crea un documento inicial y actualiza campos de perfil cuando detecta cambios. La inspección estática no verifica comportamiento en ejecución ni datos alojados.
- `PAWFINDs_ESTADO_ACTUAL.md` conserva un roadmap histórico cuya descripción de v0.4 no coincide plenamente con el diseño v0.4 ni con el código observado. El título de un commit no certifica el estado completo del módulo.

## Documentación

- Visión conceptual: [`../VISION/PAWFINDs-Master-Blueprint-v1.4.md`](../VISION/PAWFINDs-Master-Blueprint-v1.4.md).
- Diseño técnico: [`../architecture/technical-design-v0.4.md`](../architecture/technical-design-v0.4.md), que declara estado “En diseño”.
- `docs/agents/` contiene contexto y coordinación multiagente; no reemplaza ni modifica las fuentes arquitectónicas.

## Firebase y Firestore Rules

- La inspección del repositorio no encontró archivos fuente independientes de Firestore Rules ni `firebase.json` / `.firebaserc` en la raíz.
- No se consultó Firebase Console ni se verificaron Rules desplegadas. Por tanto, el estado de Rules en producción/remoto es **no verificado**.
- No se ejecutó la aplicación ni pruebas funcionales para esta fotografía.

## Integraciones externas y límites

- Confirmado por el usuario: Gemini Pro utiliza GitHub MCP con permisos de solo lectura. No está confirmado si puede ver ramas y Pull Requests o solo la rama principal.
- Confirmado por el usuario: no tiene un plan de pago de ChatGPT/Codex.
- No inferir configuración global de herramientas a partir de los archivos del repositorio.
- Este archivo debe actualizarse con fecha y evidencia en una inspección posterior; no reutilizarlo como estado vigente sin comprobarlo.
