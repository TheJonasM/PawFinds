# Flujo de trabajo multiagente — PawFinds

**Estado:** flujo general del protocolo v0.1. Las reglas detalladas están en [PROTOCOL.md](PROTOCOL.md).

El usuario mantiene la autoridad sobre producto, arquitectura, alcance y aprobación de integración. Para cada tarea se asigna explícitamente un agente responsable de escritura y, cuando sea posible, un revisor independiente. Las capacidades de cada agente se limitan a lo confirmado en [TOOLING-INVENTORY.md](TOOLING-INVENTORY.md).

## Ciclo resumido

Definir tarea y alcance → identificar fuentes → asignar roles → inspeccionar el repositorio → proponer → revisar propuesta → aprobación del usuario → implementar → probar → auditar → handoff/registro → commit autorizado → PR o integración autorizada → revisión final → aprobación del usuario → actualizar estado.

Los pasos se ajustan al tipo de tarea; toda comprobación omitida se registra como pendiente o `NOT EXECUTED`. La autorización para implementar no equivale a aprobación para integrar.

## Controles esenciales

- Un solo agente escritor por tarea; los demás analizan o revisan sin editar esos mismos archivos.
- Trabajar en una rama de tarea; `master` es estable y no se modifica directamente.
- Respetar archivos permitidos y excluidos; cualquier ampliación requiere decisión explícita del usuario.
- No resolver silenciosamente conflictos de arquitectura ni asumir capacidades de Gemini, Codex, ChatGPT o MCP.
- Ningún agente se autoaprueba. Commit o PR no significa que los cambios estén integrados.
- No guardar secretos ni crear automatización como parte del protocolo.

Consultar [PROTOCOL.md](PROTOCOL.md) para los estados, pasos, criterios de revisión, pruebas, Git y manejo de bloqueos. Usar [HANDOFF-TEMPLATE.md](HANDOFF-TEMPLATE.md) para pasar el trabajo a otro agente.
