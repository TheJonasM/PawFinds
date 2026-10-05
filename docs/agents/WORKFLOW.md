# Flujo de trabajo multiagente — PawFinds

**Estado:** base operativa inicial para validar con el usuario. No configura herramientas, no concede permisos de acceso y no ejecuta acciones automáticamente.

## Objetivo y autoridad

Coordinar análisis, implementación y revisión con responsabilidades claras, alcance verificable y decisiones humanas. El usuario/Product Owner es la autoridad final sobre producto, arquitectura, aprobación de cambios e integración. Ningún agente convierte una propuesta en decisión arquitectónica sin aprobación del usuario.

El Blueprint y el Technical Design enlazados en [README.md](README.md) son las fuentes arquitectónicas. Si entran en conflicto entre sí, con el código o con una petición, registrar la discrepancia y pedir decisión; no inventar una reconciliación.

## Roles iniciales

### Usuario / Product Owner

- Define o confirma objetivo y alcance.
- Decide asuntos de producto y arquitectura.
- Aprueba la propuesta cuando corresponda y autoriza la integración final.

### ChatGPT

- Apoya arquitectura, revisión técnica, auditoría de seguridad y control de alcance.
- No asumir que puede ejecutar cambios locales ni que tiene un plan o capacidad particular; el usuario confirmó que no tiene un plan de pago de ChatGPT/Codex.

### Codex

- Puede inspeccionar el checkout local disponible y, cuando la tarea lo autorice, preparar cambios, comprobaciones y Git en una rama de trabajo.
- No asumir acceso a servicios o ramas remotas que no estén disponibles en la sesión.

### Gemini

- Rol inicial: análisis y revisión de solo lectura mediante GitHub MCP, según confirmó el usuario.
- No asumir que puede ver ramas o Pull Requests: si el PR está visible, revisar directamente; si no, Codex comparte el diff o los archivos modificados.
- No asumir capacidad de escritura local, cambios en Git o ejecución de pruebas. Cualquier ampliación de rol requiere asignación explícita y confirmación de acceso/capacidad.

Los roles describen responsabilidades previstas, no permisos técnicos. No compartir credenciales para sortear limitaciones de acceso.

## Regla de escritura

Debe haber **un agente escritor por tarea**. El responsable de implementación es el único que modifica los archivos autorizados en esa tarea. Otros agentes pueden analizar, proponer o revisar sin editar esos archivos. Si se necesita cambiar al escritor, detener las ediciones, registrar el estado y hacer handoff explícito antes de continuar.

## Flujo de una tarea

1. **Definir tarea:** escribir resultado esperado y criterio de término.
2. **Definir alcance:** enumerar archivos/módulos permitidos y excluidos; identificar acciones externas que necesitan aprobación.
3. **Identificar fuentes:** leer arquitectura pertinente y estado Git/código relevante.
4. **Asignar responsable y revisor:** acordar un agente implementador y, cuando sea posible, otro agente revisor.
5. **Inspeccionar:** el responsable registra rama, commit, estado inicial y hallazgos pertinentes.
6. **Proponer:** describir enfoque, archivos que cambiarían, comprobaciones y dudas.
7. **Revisar propuesta:** un agente distinto la analiza si está disponible; la revisión no modifica archivos.
8. **Aprobar el inicio:** resolver las decisiones de producto/arquitectura y obtener la autorización necesaria antes de cambios dependientes.
9. **Implementar:** solo el agente escritor cambia los archivos dentro del alcance, en una rama de trabajo; `master` se considera estable.
10. **Probar:** ejecutar solo comprobaciones pertinentes y autorizadas; registrar comando, resultado y limitaciones. No presentar una revisión estática como prueba funcional.
11. **Auditar:** otro agente revisa el diff frente al alcance, las fuentes, riesgos y regresiones cuando sea posible.
12. **Registrar resultado:** actualizar el handoff/estado de la tarea con archivos, pruebas, hallazgos y pendientes.
13. **Commit:** crear un commit descriptivo solo cuando forme parte del alcance autorizado.
14. **PR o integración:** preparar un PR si está autorizado y disponible; no hacer merge ni incorporar a `master` sin aprobación explícita del usuario.
15. **Aprobación final:** el usuario decide si se integra; registrar esa decisión.
16. **Actualizar estado y continuar:** anotar resultado y pedir/definir una nueva tarea separada.

El protocolo no implica que cada tarea deba llegar a commit o PR. Se respetan las restricciones específicas de la tarea.

## Ramas y Git

- Tratar `master` como rama estable; desarrollar en ramas de trabajo.
- Antes de editar, comprobar rama y estado. No cambiar de rama, descartar cambios ajenos ni sobrescribir contenido que no pueda identificarse con seguridad.
- No hacer commit, push, merge, rebase, reset o despliegue salvo autorización expresa para esa tarea.
- Revisar el diff final y confirmar que solo contiene los archivos autorizados.
- Un PR no equivale a aprobación de integración.

## Revisión y handoff

La revisión debe ser independiente de la implementación cuando haya otro agente disponible. El revisor cita archivos/diff y separa defectos, observaciones y preguntas. La aprobación del usuario sigue siendo necesaria para integración.

Completar [HANDOFF-TEMPLATE.md](HANDOFF-TEMPLATE.md) al transferir una tarea. El handoff es texto manual, no una conexión automática entre agentes.

Si Gemini puede ver el PR, revisar ese PR directamente. Si no puede ver la rama/PR, el escritor proporciona el diff o los archivos modificados junto con commit base, objetivo y rutas; Gemini realiza revisión de solo lectura sobre ese material. La revisión queda limitada a lo compartido.

## Hechos, inferencias y capacidades

Etiquetar lo relevante como **hecho confirmado**, **inferencia**, **propuesta** o **pendiente de verificación**. No inventar resultados de pruebas, estado remoto, permisos, herramientas disponibles ni capacidades de otro agente o MCP. Consultar [TOOLING-INVENTORY.md](TOOLING-INVENTORY.md) y registrar evidencia nueva antes de cambiar una afirmación.

## Conflictos y cambios fuera de alcance

- Si fuentes arquitectónicas discrepan, pausar la decisión afectada, describir ambas fuentes y pedir decisión al usuario.
- Si una tarea exige un archivo/acción fuera del alcance, no ejecutarlo. Informar qué bloquea el objetivo y solicitar autorización para ampliar el alcance.
- Si se descubre un cambio preexistente no identificable con seguridad, no sobrescribirlo; preservar el estado y pedir instrucciones.
- Si los agentes discrepan, documentar argumentos y evidencia; el usuario decide.

## Secretos y automatización

No almacenar tokens, claves, secretos, credenciales ni claves privadas en esta carpeta, commits, PRs o handoffs. No crear servidores MCP, bots, agentes autónomos, GitHub Actions ni automatizaciones como parte de este flujo base. Cualquier diseño futuro requiere una tarea y autorización separadas.
