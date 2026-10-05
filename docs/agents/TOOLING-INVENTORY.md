# Inventario de herramientas — PawFinds

**Última revisión documental:** 5 de octubre de 2026. Distinguir observaciones locales de hechos confirmados por el usuario. No contiene credenciales.

## Confirmado en el repositorio

- Repositorio Git con remoto local `origin` → `https://github.com/TheJonasM/PawFinds.git`.
- `.vscode/mcp.json` existe localmente, pero `servers` está vacío; no configura un servidor MCP de proyecto. El archivo está excluido por `.gitignore`.
- No se encontró configuración MCP ejecutable para agentes, ni configuración específica de Gemini o Codex en los archivos inspeccionados.
- No se encontraron `AGENTS.md`, workflows de agentes ni automatizaciones del repositorio durante la inspección documentada.

## Confirmado por el usuario

- Gemini Pro estaba conectado al GitHub MCP con permisos de solo lectura.
- El usuario no tiene un plan de pago de ChatGPT/Codex.
- El usuario toma las decisiones y aprueba la integración de cambios.

## No confirmado

- No se sabe si Gemini puede leer ramas y Pull Requests o únicamente la rama principal. El flujo debe admitir revisión directa del PR cuando esté visible y, de lo contrario, revisión de un diff o de archivos modificados compartidos por Codex.
- Las capacidades de lectura/escritura de cualquier agente fuera de lo anterior no se infieren de este inventario.
- No se verificaron configuraciones globales de herramientas, permisos/protecciones de GitHub ni conexiones activas en aplicaciones externas.
- La inspección del archivo MCP no demuestra qué integraciones puedan existir fuera del repositorio.

Registrar cambios de capacidades solo con evidencia nueva o confirmación del usuario. Nunca copiar tokens, claves, secretos ni credenciales.
