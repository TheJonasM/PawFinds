# PawFinds — colaboración entre agentes

`docs/agents/` contiene las reglas operativas y el contexto mínimo para colaborar en PawFinds. No concede permisos técnicos, no automatiza acciones y no constituye autoridad automática para modificar el repositorio.

## Orden de lectura

1. [Contexto del proyecto](PROJECT-CONTEXT.md).
2. [Estado actual observado](CURRENT-STATE.md), verificando su fecha y Git antes de confiar en él.
3. [Inventario de herramientas](TOOLING-INVENTORY.md).
4. [Flujo general](WORKFLOW.md).
5. [Protocolo multiagente v0.1](PROTOCOL.md), antes de ejecutar una tarea compartida.
6. [Plantilla de handoff](HANDOFF-TEMPLATE.md), al transferir una tarea.

## Fuentes de verdad

- Visión y arquitectura conceptual: [Master Blueprint v1.4](../VISION/PAWFINDs-Master-Blueprint-v1.4.md).
- Diseño técnico: [Technical Design v0.4](../architecture/technical-design-v0.4.md).
- Estado del checkout: Git y archivos efectivamente inspeccionados en la tarea, con fecha y commit de referencia.
- Herramientas: evidencia del repositorio y hechos confirmados por el usuario, distinguidos de inferencias y aspectos no verificados.

El Blueprint y el Technical Design conservan la autoridad arquitectónica. Esta carpeta explica cómo consultarlos y colaborar; no los reemplaza, no duplica su arquitectura y no puede aprobar por sí misma una decisión.

## Autoridad y alcance

El usuario decide sobre producto y arquitectura, define o aprueba el alcance y autoriza la integración. Cada tarea debe especificar archivos y resultado esperados. Ningún agente debe ampliar ese alcance por iniciativa propia. Toda discrepancia se documenta y se eleva al usuario.

Consultar [WORKFLOW.md](WORKFLOW.md) y [PROTOCOL.md](PROTOCOL.md) antes de comenzar una tarea. `WORKFLOW.md` resume el ciclo general; `PROTOCOL.md` define los controles operativos. Si estos documentos contradicen una fuente rectora o el estado observado, detener el trabajo afectado y solicitar decisión; no tratar esta carpeta como autorización automática para cambiar código.
