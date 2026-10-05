# Contexto del proyecto PawFinds

PawFinds busca evolucionar desde una aplicación web de rescate y radar para mascotas hacia un ecosistema centrado en las mascotas y las personas que las cuidan. La visión y el diseño técnico detallados viven en los documentos rectores; este resumen no los sustituye.

## Principios de colaboración

- Trabajar de manera incremental, preservando el comportamiento fuera del alcance aprobado.
- Consultar las fuentes arquitectónicas antes de proponer cambios.
- Mantener diferenciados hechos confirmados, inferencias, propuestas y pendientes de verificación.
- No asumir que código presente equivale a funcionalidad probada o desplegada.
- El usuario conserva la decisión final sobre producto, arquitectura y aprobación de integración.

## Fuentes rectoras

- [PAWFINDs Master Blueprint v1.4](../VISION/PAWFINDs-Master-Blueprint-v1.4.md).
- [Technical Design v0.4](../architecture/technical-design-v0.4.md).

Ante una discrepancia arquitectónica, no resolverla reinterpretando o duplicando estos documentos dentro de `docs/agents/`; registrar el conflicto y solicitar decisión al usuario.

## Límite de esta carpeta

`docs/agents/` define contexto y coordinación. No implementa módulos de PawFinds, no concede acceso a GitHub/Firebase/MCP, no reemplaza revisión humana y no autoriza cambios fuera del alcance indicado para una tarea. Véase [WORKFLOW.md](WORKFLOW.md).
