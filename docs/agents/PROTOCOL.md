# PAWFINDs Multiagent Protocol v0.1

**Estado:** propuesta operativa v0.1 para validación del usuario.
**Propósito:** coordinar tareas de PawFinds con alcance, responsable de escritura, revisión independiente y aprobación humana trazables.
**Límite:** este documento no concede permisos técnicos, no configura MCP y no autoriza por sí solo una tarea concreta.

## 1. Autoridad y fuentes

El usuario/Product Owner tiene la decisión final sobre prioridades, alcance, arquitectura, aceptación de implementación e integración. Ningún agente puede autoaprobarse, ampliar el alcance, saltarse revisiones requeridas, tratar una propuesta como aprobada, modificar `master` directamente ni integrar cambios sin autorización explícita.

La arquitectura de PawFinds se consulta en [PAWFINDs Master Blueprint v1.4](../VISION/PAWFINDs-Master-Blueprint-v1.4.md) y [Technical Design v0.4](../architecture/technical-design-v0.4.md). `docs/agents/` describe coordinación; no reemplaza esas fuentes ni crea decisiones arquitectónicas.

Antes de cada tarea, identificar las secciones pertinentes y la evidencia de estado del repositorio. Si aparece una contradicción, no elegir en silencio: documentar las fuentes, el conflicto y su impacto, pausar la decisión afectada y pedir resolución humana.

## 2. Roles por tarea

Los roles se asignan explícitamente para cada tarea; no establecen una jerarquía permanente entre agentes.

### Usuario / Product Owner

- Define prioridad y objetivo, aprueba el alcance y resuelve decisiones de producto/arquitectura.
- Decide si acepta el resultado y autoriza su integración.

### ChatGPT

- Puede actuar como apoyo de arquitectura, revisión técnica y de seguridad, revisión de alcance y auditoría.
- No se asume que implementa en el repositorio ni que tiene acceso a una herramienta o plan determinado.

### Codex

- Puede inspeccionar el checkout disponible; si es asignado como writer, implementar, ejecutar las comprobaciones acordadas y gestionar Git dentro del alcance autorizado.
- Puede preparar commits o PRs solo cuando la tarea lo autorice y las capacidades estén disponibles. No se asume acceso remoto por disponer de un checkout local.

### Gemini

- Puede analizar, investigar y proponer. El usuario confirmó acceso de solo lectura a GitHub MCP para Gemini Pro.
- No se ha confirmado si puede ver ramas/PRs o solo la rama principal, ni acceso de escritura al repositorio local.
- Puede ser writer en una tarea futura solo si se le asigna explícitamente y su acceso de escritura queda confirmado. Hasta entonces, su rol confirmado es de solo lectura.

### Ejemplos de asignación

- Gemini: análisis/propuesta → ChatGPT: revisión → Codex: implementación → ChatGPT: auditoría.
- Codex: inspección/propuesta → ChatGPT: revisión → Codex: implementación → Gemini: segunda revisión si el material está visible o se comparte.
- Gemini: implementación únicamente si la asignación y la capacidad de escritura están confirmadas → ChatGPT: revisión → Codex: validación local del repositorio si está disponible.

## 3. Un único writer (One Writer Agent)

Cada tarea tiene exactamente un **writer autorizado** para modificar los archivos enumerados. Los demás agentes pueden analizar, proponer, probar o revisar sin editar simultáneamente esos archivos. “Multiagente” significa repartir funciones —analizar, proponer, implementar, probar, auditar y revisar—; no significa escritura concurrente.

Registrar writer, reviewer y archivos permitidos antes de implementar. Si el writer cambia:

1. detener las ediciones del writer actual;
2. guardar el estado en el handoff: rama, commit base, archivos modificados y pendientes;
3. asignar explícitamente el nuevo writer y confirmar su acceso;
4. revalidar alcance y estado Git antes de reanudar.

Un reviewer no corrige silenciosamente el trabajo del writer. Devuelve `REQUEST CHANGES` o `REJECT` con rutas, evidencia y corrección requerida; el writer autorizado decide/aplica los cambios aprobados dentro del alcance.

## 4. Definición y control de alcance

Antes de editar, el registro de tarea/handoff debe incluir:

- identificador y objetivo;
- alcance incluido y archivos autorizados;
- archivos/acciones prohibidos;
- fuentes consultadas;
- writer y reviewer;
- pruebas esperadas y criterio de aceptación;
- riesgos y dependencias;
- rama y commit base.

Una mejora no solicitada se registra como `OUT OF SCOPE`; no se implementa automáticamente. Si el trabajo necesita otro archivo, módulo, permiso o acción externa, detener la parte afectada, explicar por qué y solicitar ampliación explícita del alcance.

## 5. Ciclo operativo

Los pasos 1–8 y 16 son obligatorios para tareas de implementación. Los pasos de código, pruebas, seguridad, commit, PR y merge se aplican según la tarea y su autorización. Si un paso no aplica, marcarlo `NOT APPLICABLE` con motivo; si era aplicable pero no pudo ejecutarse, marcar `NOT EXECUTED` y explicar el bloqueo.

1. **TASK DEFINITION — obligatorio:** registrar objetivo, resultado esperado e identificador.
2. **SCOPE DEFINITION — obligatorio:** fijar incluidos, excluidos, archivos autorizados/prohibidos, riesgos, dependencias y criterios de aceptación.
3. **SOURCE OF TRUTH IDENTIFICATION — obligatorio:** consultar fuentes arquitectónicas pertinentes, estado Git/código y registrar conflictos.
4. **AGENT ASSIGNMENT — obligatorio:** nombrar un writer y un reviewer; si no hay reviewer disponible, declararlo y pedir al usuario una ruta de revisión aceptable antes de integrar.
5. **REPOSITORY INSPECTION — obligatorio para cambios locales:** confirmar rama, commit base, `git status`, archivos pertinentes y cambios preexistentes.
6. **PROPOSAL — obligatorio antes de cambios de implementación:** describir enfoque, archivos, validación y dudas.
7. **REVIEW — obligatorio antes de implementar cambios de alcance/arquitectura o código con impacto relevante:** un agente distinto revisa la propuesta y puede pedir cambios. Para tareas triviales de documentación, registrar por qué se omitió una revisión multiagente si no hay otro agente disponible.
8. **USER APPROVAL — obligatorio antes de cambios dependientes de una decisión:** el usuario aprueba explícitamente objetivo/alcance y las decisiones pendientes. Estado `APPROVED` autoriza únicamente el inicio del trabajo definido; no aprueba el resultado ni su integración.
9. **IMPLEMENTATION — condicional:** solo el writer cambia los archivos autorizados en una rama de trabajo. Si no hay edición, registrar el análisis/propuesta sin fingir implementación.
10. **TESTING — condicional por tipo:** ejecutar las pruebas acordadas para cambios funcionales. Para documentación/cambios estructurales, realizar validaciones estáticas pertinentes. Registrar comandos y resultados o `NOT EXECUTED`.
11. **SECURITY AUDIT — según riesgo:** obligatorio cuando el cambio afecta autenticación, autorización, datos sensibles, Rules, secretos, límites de confianza o una superficie de seguridad. Para cambios sin impacto de seguridad, indicar `NOT APPLICABLE` y motivo.
12. **HANDOFF — obligatorio al cambiar responsable o entregar a otro agente:** completar [HANDOFF-TEMPLATE.md](HANDOFF-TEMPLATE.md); también usarlo para cerrar tareas multiagente si hace falta continuidad.
13. **COMMIT — condicional y con autorización de la tarea:** revisar `git diff`, `git diff --check`, archivos staged y `git status`; crear un commit descriptivo solo si está autorizado. Commit no significa integración.
14. **PR / INTEGRATION — condicional:** preparar/actualizar PR o preparar la integración si está autorizada y disponible. En este paso no hacer merge; PR no significa aprobación.
15. **FINAL REVIEW — obligatorio antes de integrar:** reviewer distinto inspecciona el resultado/diff final y confirma hallazgos resueltos o pendientes explícitos.
16. **USER APPROVAL — obligatorio antes de integrar:** obtener autorización explícita del usuario para el resultado y la integración concreta. Aprobación previa para implementar no sustituye esta aprobación.
17. **MERGE — condicional:** solo tras la aprobación final explícita y mediante el actor/capacidad autorizados. Nunca modificar `master` directamente como parte de la implementación normal.
18. **STATE UPDATE — obligatorio al cerrar o bloquear:** registrar commit/PR si existen, estado final, pruebas, revisión, riesgos y pendientes.
19. **NEXT TASK — condicional:** iniciar una tarea nueva con identificador, alcance y autorizaciones propios; no heredar permisos implícitamente.

No todas las tareas producen código, commit, PR o merge. Las restricciones particulares de la petición prevalecen; una instrucción que prohíba commit o integración cancela esos pasos para esa tarea.

## 6. Estados de una tarea

Registrar un estado operativo en el handoff o seguimiento de la tarea:

| Estado | Significado |
|---|---|
| `PROPOSED` | Objetivo/alcance propuestos; no hay aprobación de implementación. |
| `REVIEW` | Propuesta o cambios están en revisión; no autoriza escribir al reviewer. |
| `APPROVED` | El usuario aprobó el alcance/propuesta para comenzar la implementación definida. No aprueba el resultado ni la integración. |
| `IMPLEMENTING` | El writer asignado está modificando únicamente lo autorizado. No equivale a aprobación. |
| `TESTING` | Se están ejecutando comprobaciones acordadas; resultados aún no se presumen. |
| `AUDIT` | Se revisan diff, alcance, arquitectura, seguridad y compatibilidad según corresponda. |
| `READY_FOR_INTEGRATION` | Revisión final sin bloqueos conocidos; falta autorización explícita del usuario para integrar. |
| `COMMITTED` | Existe commit local/remoto identificado; el cambio puede seguir sin integrar. No equivale a `INTEGRATED`. |
| `INTEGRATED` | Cambio incorporado mediante la operación aprobada; registrar referencia verificable. |
| `BLOCKED` | Falta acceso, decisión, dependencia o evidencia necesaria. No improvisar para avanzar. |
| `REJECTED` | Usuario o revisión rechaza la propuesta/cambio; registrar motivo y no integrarlo. |

Transición normal: `PROPOSED` → `REVIEW` → `APPROVED` → `IMPLEMENTING` → `TESTING` → `AUDIT` → `COMMITTED` si aplica → `READY_FOR_INTEGRATION` → aprobación final explícita del usuario → integración confirmada → `INTEGRATED`. Si no corresponde commit/PR, se puede pasar de `AUDIT` a `READY_FOR_INTEGRATION` con el motivo registrado.

`INTEGRATED` es un estado terminal: no admite transiciones de la misma tarea. Si después de la integración se requiere una corrección, mejora o investigación, se inicia una `NEXT TASK` con identificador, alcance, revisión, aprobación, implementación, pruebas, auditoría e integración propios, según el paso 19. No se define un mecanismo técnico de relación entre tareas.

`BLOCKED` y `REJECTED` pueden alcanzarse desde cualquier etapa activa anterior a `INTEGRATED`. No tienen transiciones de salida definidas; no se permite reabrirlos ni recuperarlos mediante una transición implícita.

`REQUEST CHANGES` es un resultado de revisión, no un estado. Si la revisión ocurre antes de que el alcance haya sido aprobado, el resultado devuelve la propuesta de `REVIEW` a `PROPOSED`. Si la tarea ya recibió `APPROVED` y una revisión posterior del trabajo, antes de `INTEGRATED`, solicita cambios, vuelve a `IMPLEMENTING` y continúa el mismo writer. El resultado y sus findings se conservan en el registro/handoff de la tarea.

`PROPOSED` nunca significa `APPROVED`; `IMPLEMENTING` nunca significa aprobado; `COMMITTED` nunca significa `INTEGRATED`.

## 7. Evidencia, hechos y capacidades

Usar estas etiquetas en informes y handoffs:

- `FACT`: observado directamente en código, documentación o configuración disponible; indicar ruta/commit cuando sea útil.
- `USER-CONFIRMED`: declarado explícitamente por el usuario.
- `INFERENCE`: conclusión razonada, identificada como inferencia.
- `PROPOSAL`: solución posible aún no aprobada.
- `PENDING VERIFICATION`: falta evidencia para afirmarlo.

Si no está confirmado que un agente puede ver ramas/PRs, escribir archivos, ejecutar comandos, acceder al repo/GitHub o usar una integración MCP, marcarlo `NOT CONFIRMED`. No inventar resultados ni acceso. Usar como alternativa un diff, archivos compartidos, commit de referencia o reporte; dejar claro el límite de lo que se pudo revisar.

## 8. Revisión

El reviewer independiente revisa y reporta:

- **Correctness:** cumplimiento del objetivo y criterios de aceptación.
- **Scope:** solo archivos y acciones autorizados.
- **Architecture:** coherencia con fuentes rectoras y decisiones aprobadas.
- **Security:** riesgos introducidos, confianza, permisos y exposición de datos cuando aplique.
- **Compatibility:** regresiones o comportamiento existente afectado.
- **Tests:** pruebas pertinentes, resultados y pruebas no ejecutadas.
- **Git:** rama, base, archivos y diff correspondientes a la tarea.

El resultado es `PASS`, `REQUEST CHANGES` o `REJECT`, siempre con evidencia. `PASS` significa que la revisión no encontró bloqueos dentro de su alcance; no es aprobación del usuario. El reviewer no modifica el trabajo. La aceptación del reviewer no sustituye la aprobación del usuario.

## 9. Pruebas y auditoría

Separar las comprobaciones:

- **STATIC VALIDATION:** diff, formato/sintaxis, estructura, archivos afectados y búsqueda de secretos.
- **DYNAMIC VALIDATION:** ejecución, comportamiento, pruebas funcionales o integración.
- **SECURITY VALIDATION:** permisos, Rules, exposición de datos, entradas abusivas y regresiones de seguridad.

Elegirlas por alcance y riesgo. Informar el comando/contexto y el resultado. Toda comprobación aplicable que no se pueda ejecutar se marca `NOT EXECUTED` con motivo; nunca inventar aprobación por ausencia de errores observados estáticamente.

## 10. Git e integración

- `master` es la rama estable. Para tareas normales, inspeccionar y trabajar en una rama de trabajo; no editar `master` directamente.
- Registrar branch y base commit; revisar `git status` antes de tocar archivos.
- Antes de commit, inspeccionar `git diff`, `git diff --check`, staged files y confirmar que solo cambian rutas autorizadas.
- Después de commit, revisar `git status` y registrar el hash. No borrar ni sobrescribir trabajo de otro agente sin revisión/autorización.
- No usar `reset` destructivo ni borrar trabajo ajeno. No hacer force push sin autorización explícita específica; no hacer push si la tarea no lo autoriza.
- Commit y PR son artefactos de trazabilidad, no aprobaciones. Merge/integración requiere autorización final explícita del usuario.

## 11. Handoff y acceso fallido

El handoff debe permitir continuar sin reconstruir la conversación: ID, objetivo, estado, branch, base commit, writer/reviewer, archivos permitidos/modificados, fuentes, cambios, pruebas/resultados, riesgos, discrepancias, pendientes, responsable, siguiente acción y aprobaciones requeridas. Usar [HANDOFF-TEMPLATE.md](HANDOFF-TEMPLATE.md).

Si un agente no puede acceder a una rama o PR:

1. marcar la tarea `BLOCKED` para esa revisión de acceso;
2. decir exactamente qué contenido falta y por qué se necesita;
3. solicitar al writer un diff o archivos modificados con commit base, rutas y objetivo;
4. revisar solo lo compartido y declarar la limitación.

Si falta cualquier otro acceso o dato, no inventar su contenido. Registrar qué falta, por qué es necesario y una alternativa verificable.

## 12. Cambios arquitectónicos, discrepancias y alcance

Si completar una tarea parece requerir cambiar arquitectura, detener la implementación afectada y registrar arquitectura/fuente actual, problema, propuesta, impacto, archivos afectados y riesgos. La propuesta requiere revisión y aprobación explícita del usuario antes de incorporarse.

Si documentos parecen contradecirse, registrar fuente A, fuente B, conflicto, impacto y decisión pendiente. No escoger silenciosamente una fuente. ChatGPT puede analizar/revisar la cuestión arquitectónica, pero el usuario conserva la decisión final.

Todo hallazgo adicional se etiqueta `OUT OF SCOPE` y se convierte en tarea futura solo si el usuario decide priorizarlo. Si cambia el alcance, registrar aprobación antes de modificar nuevos archivos.

## 13. Secretos y automatización

Nunca incluir en `docs/agents/`, handoffs, commits o PRs API keys, tokens, contraseñas, credenciales de service account, claves privadas, secretos OAuth, JSON de Firebase service account o credenciales MCP. Se puede documentar que existe una configuración sin copiar su valor secreto.

Este protocolo no implementa bots, GitHub Actions, agentes autónomos, pipelines, webhooks, MCP adicional, servidores, automatización de PRs ni scripts de orquestación. Requieren una tarea separada y autorización propia.
