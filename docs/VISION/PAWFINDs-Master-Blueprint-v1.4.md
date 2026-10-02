# PAWFINDs

## Vision & Master Blueprint v1.4

**Documento maestro de visión y arquitectura conceptual**

**Estado:** 🟢 Aprobado como base conceptual
**Versión:** 1.4
**Propósito:** Definir la visión, principios, entidades, relaciones, capacidades y decisiones arquitectónicas fundamentales de PawFinds.

---

# 1. VISIÓN

PawFinds no debe ser concebido únicamente como una plataforma para reportar mascotas perdidas.

PawFinds debe convertirse en un:

> **ecosistema digital global centrado en las mascotas, que conecta mascotas, personas, familias, organizaciones, rescate, salud, comunidad, dispositivos, servicios, campañas y comercio.**

El objetivo es construir una infraestructura digital alrededor de la vida de una mascota.

La mascota debe ser una entidad central del sistema y no simplemente un elemento secundario dentro de un reporte.

PawFinds debe ser útil:

* cuando una mascota está perdida;
* cuando una mascota es encontrada;
* cuando necesita ayuda;
* cuando necesita atención veterinaria;
* cuando necesita medicamentos;
* cuando necesita vacunas;
* cuando necesita seguimiento;
* cuando viaja;
* cuando utiliza dispositivos;
* cuando participa en una comunidad;
* cuando pertenece a una organización;
* cuando necesita asistencia de emergencia;
* y también cuando simplemente está viviendo su vida cotidiana.

---

# 2. PRINCIPIO FUNDAMENTAL

PawFinds se construirá alrededor de cuatro conceptos principales:

> **ENTIDADES + RELACIONES + EVENTOS + PERMISOS**

Las entidades representan las cosas importantes del ecosistema.

Las relaciones representan quién puede interactuar con qué.

Los eventos representan acontecimientos que ocurren dentro del ecosistema.

Los permisos determinan qué puede hacer cada actor sobre cada recurso y dentro de qué alcance.

Este principio permitirá que PawFinds evolucione sin tener que reconstruir su arquitectura cada vez que aparezca una nueva funcionalidad.

---

# 3. PRINCIPIO DE EVOLUCIÓN

PawFinds seguirá el principio:

> **“Construir hoy lo que sabemos que necesitaremos mañana, sin construir mañana antes de tiempo.”**

Esto significa:

* preparar la arquitectura para necesidades futuras conocidas;
* evitar implementar funcionalidades prematuramente;
* evitar acoplar el sistema a proveedores específicos;
* evitar decisiones irreversibles innecesarias;
* mantener separadas las responsabilidades;
* documentar las decisiones importantes;
* y permitir que nuevas capacidades se conecten al núcleo existente.

---

# 4. ENTIDADES CENTRALES

Las entidades fundamentales del ecosistema son:

```text
USER
ORGANIZATION
MEMBERSHIP
PET
PAWFINDs PET ID
CREDENTIAL / IDENTIFIER
DEVICE
PET GUARDIAN
CASE
ALERT
EVENT
TRAVEL
LOCATION
DOCUMENT
HEALTH RECORD
NOTIFICATION
AUDIT LOG
```

Estas entidades forman la infraestructura conceptual sobre la que posteriormente podrán construirse diferentes módulos.

---

# 5. PET CORE

La mascota (`PET`) es una entidad de primera clase.

No debe tratarse simplemente como información almacenada dentro de un reporte.

Conceptualmente, una mascota puede tener:

```text
PET
 ├── Identity
 ├── Profile
 ├── Guardians
 ├── Health
 ├── Medical Records
 ├── Medications
 ├── Treatments
 ├── Vaccinations
 ├── Allergies
 ├── Surgeries
 ├── Documents
 ├── Needs
 ├── Behavior
 ├── Devices
 ├── Cases
 ├── Events
 ├── Timeline
 ├── Permissions
 ├── Emergency Profile
 └── Travel
```

No se debe implementar toda esta información dentro de un único documento gigante de Firestore.

La información debe dividirse de acuerdo con su naturaleza, privacidad, frecuencia de acceso y necesidades de seguridad.

---

# 6. IDENTIDAD DE LA MASCOTA

PawFinds debe distinguir claramente entre:

```text
petId
pawfindsPetId
credentialId
deviceId
```

## petId

Es el identificador interno estable de la mascota.

Debe funcionar como ancla interna del ecosistema.

Características:

* interno;
* estable;
* inmutable;
* no diseñado como identificador público;
* utilizado para relacionar información dentro de PawFinds.

## PawFinds Pet ID

Es la identidad digital persistente y pública de la mascota dentro del ecosistema PawFinds.

Debe permitir que diferentes capacidades se conecten alrededor de la misma mascota.

Conceptualmente:

```text
PET
 ↓
PawFinds Pet ID
 ↓
ecosistema PawFinds
```

El `PawFinds Pet ID` no debe confundirse con el `petId` interno.

## Credential

Una credencial puede representar un mecanismo mediante el cual se accede o identifica una mascota.

Ejemplos futuros:

* QR;
* NFC;
* identificador físico;
* otros mecanismos.

## Device

Un dispositivo es hardware conectado a la mascota o a su identidad.

Ejemplos:

* GPS;
* tracker;
* dispositivos futuros.

Una credencial o dispositivo debe resolver estructuralmente hacia el `petId` interno.

No debe depender conceptualmente del identificador público.

---

# 7. GUARDIANS Y RELACIONES

Una mascota puede estar relacionada con múltiples personas u organizaciones.

Ejemplos:

* Owner;
* Co-owner;
* Caregiver;
* Emergency Contact;
* Veterinarian;
* Authorized Organization.

Por esta razón, la relación no debe implementarse simplemente como:

```text
pets/{petId}
    ownerId
```

Debe existir una relación explícita:

```text
PET
 ↓
PET GUARDIAN
 ↓
USER / ORGANIZATION
```

Una relación de guardian puede incluir:

* `petId`;
* `userId`;
* `organizationId`;
* `role`;
* `permissions`;
* `status`;
* `scope`;
* `createdAt`;
* `expiresAt`.

Esto permitirá implementar relaciones más complejas sin reconstruir el modelo posteriormente.

---

# 8. PET PUBLIC PROFILE

La información pública de una mascota debe mantenerse separada de la información privada.

Conceptualmente:

```text
pet_public_profiles/{petId}
```

Puede contener información autorizada para exposición pública.

Ejemplos:

* nombre;
* especie;
* raza;
* fotografía;
* descripción;
* información básica;
* información pública autorizada.

No debe contener automáticamente:

* dirección exacta;
* información médica privada;
* datos personales innecesarios;
* información sensible del responsable.

---

# 9. PET EMERGENCY PROFILE

La información de emergencia debe estar separada de la información privada y médica.

Conceptualmente:

```text
pet_emergency_profiles/{petId}
```

Debe existir una política explícita de exposición.

Ejemplo conceptual:

```text
enabled
visibility
allowedContexts
updatedAt
```

Puede contener información como:

* alergias relevantes;
* medicamentos importantes;
* necesidades especiales;
* instrucciones de manejo;
* comportamiento;
* dieta;
* contacto de emergencia;
* veterinario.

La información mostrada dependerá de la política de exposición.

Firestore Rules no debe utilizarse como mecanismo para “filtrar campos” dentro de un mismo documento.

---

# 10. QR / NFC Y RESOLUCIÓN DE IDENTIDAD

Un futuro escaneo debe seguir conceptualmente este flujo:

```text
SCAN QR / NFC
       ↓
IDENTIFY CREDENTIAL
       ↓
RESOLVE TO PET
       ↓
EVALUATE EXPOSURE POLICY
       ↓
SHOW AUTHORIZED INFORMATION
       ↓
REPORT FOUND / LOCATION
       ↓
CONTACT RESPONSIBLE
       ↓
FOLLOW CASE
       ↓
REUNIFICATION
```

El QR o NFC no constituye la identidad de la mascota.

Es una credencial que permite resolver hacia la identidad estable.

La lógica futura será:

```text
Credential
     ↓
Trusted Resolver
     ↓
petId
     ↓
Exposure Policy
     ↓
Authorized Information
```

La política de emergencia no debe asumir que un simple campo `allowedContexts` demuestra que un escaneo ocurrió.

---

# 11. DEVICES

PawFinds debe poder evolucionar hacia un ecosistema de dispositivos.

Conceptualmente:

```text
PET
 └── DEVICES
      ├── QR TAG
      ├── NFC TAG
      ├── MICROCHIP
      ├── GPS TRACKER
      └── FUTURE DEVICE
```

La arquitectura no debe estar acoplada desde el principio a un fabricante específico.

Futura capa:

```text
PawFinds
     ↓
Device Integration Layer
     ↓
Manufacturer A
Manufacturer B
Manufacturer C
Future Partners
```

El objetivo es que PawFinds pueda incorporar diferentes tecnologías sin modificar el núcleo de la plataforma.

---

# 12. PET, CASE Y ALERT

Estas tres entidades deben permanecer separadas.

## PET

Representa la identidad persistente de una mascota.

## CASE

Representa una situación o proceso temporal.

Ejemplos:

* mascota perdida;
* mascota encontrada;
* rescate;
* proceso de reunificación;
* incidente.

Un Case puede comenzar sin conocer la mascota:

```text
petId: null
```

Posteriormente puede vincularse:

```text
CASE.petId = existingPetId
```

## ALERT

Representa la manifestación pública o geográfica de un Case.

Conceptualmente:

```text
PET
 ↓
CASE
 ↓
ALERT
```

Esto permite separar la identidad permanente de la situación temporal y de su representación pública.

---

# 13. ESTADOS INDEPENDIENTES

Los estados de diferentes entidades no deben mezclarse.

## Pet

```text
Active
Deceased
Unknown
```

## Case

```text
Open
In Progress
Closed
Reunified
```

## Alert

```text
Pending
Approved
Rejected
Resolved
```

## Device

```text
Active
Inactive
Lost
Replaced
```

Esto evita depender de un único campo de estado que intente representar conceptos diferentes.

---

# 14. LOCATION Y GEOGRAFÍA

La ubicación es una capacidad transversal.

Puede estar asociada a:

* usuarios;
* mascotas;
* reportes;
* casos;
* alertas;
* sightings;
* dispositivos;
* organizaciones;
* eventos;
* viajes.

La arquitectura futura debe considerar:

* viewport;
* bounding box;
* zoom;
* clustering;
* indexación geoespacial;
* geohash u otra estrategia;
* privacidad por precisión;
* consultas geográficas eficientes.

PawFinds no debe descargar todas las alertas globales al cliente.

La ubicación exacta de una persona o mascota no debe exponerse públicamente por defecto.

En casos perdidos puede utilizarse una ubicación aproximada para exposición pública y reservar la ubicación precisa para usuarios autorizados.

---

# 15. EVENTOS

Los eventos representan acontecimientos dentro del ecosistema.

Modelo conceptual:

```text
EVENT
 ├── eventId
 ├── eventType
 ├── source
 ├── actorId
 ├── targetType
 ├── targetId
 ├── timestamp
 ├── visibility
 ├── metadata
 └── scope
```

Los eventos pueden apuntar a:

```text
PET
CASE
ALERT
DEVICE
ORGANIZATION
CREDENTIAL
TRAVEL
```

Ejemplos:

* mascota creada;
* mascota vinculada;
* GPS conectado;
* vacuna registrada;
* medicamento creado;
* mascota perdida;
* avistamiento registrado;
* alerta aprobada;
* reunificación completada.

---

# 16. EVENT ENGINE FUTURO

La arquitectura debe permitir evolucionar hacia:

```text
EVENT
   ↓
RULE
   ↓
ACTION
   ↓
NOTIFICATION
```

Ejemplos:

```text
Vacuna próxima
     ↓
Regla
     ↓
Recordatorio
     ↓
Notificación
```

```text
GPS sale de zona segura
     ↓
Regla
     ↓
Security Event
     ↓
Notificación
```

El motor completo de eventos, reglas y acciones no forma parte de la implementación inicial de v0.4.

La infraestructura inicial solamente debe dejar preparada la base.

---

# 17. PET TIMELINE

La mascota podrá tener una línea temporal de acontecimientos.

Ejemplos:

* consulta veterinaria;
* medicamento;
* vacuna;
* tratamiento;
* cirugía;
* dispositivo conectado;
* caso perdido;
* avistamiento;
* reunificación;
* viaje.

Esto permitirá construir posteriormente una historia digital coherente de la mascota.

---

# 18. HEALTH Y MEDICAL

La salud es una capacidad futura importante.

Debe mantenerse separada de la información pública.

Conceptualmente:

```text
PET
 ├── Health
 ├── Medical Records
 ├── Medications
 ├── Treatments
 ├── Vaccinations
 ├── Allergies
 └── Surgeries
```

La información médica debe utilizar controles de acceso específicos y no debe exponerse automáticamente mediante el perfil público.

---

# 19. TRAVEL

PawFinds podrá incorporar capacidades relacionadas con viajes de mascotas.

Conceptualmente:

```text
PET
 └── TRAVEL
      ├── Trips
      ├── Destinations
      ├── Requirements
      ├── Documents
      ├── Transport
      ├── Reminders
      └── Travel History
```

El perfil de viaje puede incluir:

* ansiedad;
* comportamiento;
* necesidades especiales;
* medicamentos;
* dieta;
* alergias;
* instrucciones de manejo;
* contacto de emergencia;
* recomendaciones veterinarias.

Los requisitos de viaje deben ser dinámicos.

La arquitectura debe contemplar:

```text
source
jurisdiction
verifiedAt
effectiveFrom
expiresAt
version
verificationStatus
```

No se debe asumir que los requisitos de un país, operador o destino permanecen estáticos.

---

# 20. FUTURO PET TRAVEL NETWORK

A largo plazo, PawFinds podría conectar:

```text
PET
 ↕
VETERINARIAN
 ↕
TRANSPORT
 ↕
ACCOMMODATION
 ↕
DESTINATION
```

Esto puede evolucionar hacia servicios, alianzas y eventualmente modelos comerciales.

No se debe implementar todavía un marketplace ni pagos específicos para esta capacidad.

---

# 21. ORGANIZATIONS

Una organización es una entidad propia.

No debe confundirse con un rol.

Ejemplos futuros:

* refugios;
* fundaciones;
* veterinarias;
* organizaciones de rescate;
* empresas;
* comunidades;
* aliados;
* patrocinadores.

Modelo conceptual:

```text
USER
   ↓
MEMBERSHIP
   ↓
ORGANIZATION
```

Una misma persona puede tener diferentes roles dentro de diferentes organizaciones.

---

# 22. MEMBERSHIP

Membership representa la relación entre una persona y una organización.

Permite implementar:

* roles;
* permisos;
* estado;
* alcance;
* fechas de vigencia.

No se deben almacenar todas las memberships dentro de Custom Claims.

Las memberships pueden crecer y cambiar demasiado para ser una buena estructura de claims.

---

# 23. SEGURIDAD

El modelo objetivo de seguridad es:

```text
Firebase Auth
      ↓
Identity
      ↓
RBAC / ReBAC
      ↓
Permission
      ↓
Scope
      ↓
Firestore Rules / Trusted Backend
```

Debe existir una combinación de:

### RBAC

Control basado en roles.

Ejemplos:

* Owner;
* Caregiver;
* Vet;
* Moderator;
* Admin.

### ReBAC

Control basado en relaciones.

Ejemplo:

```text
User A
   ↓
Guardian
   ↓
Pet B
```

El acceso depende de la relación existente.

---

# 24. PERMISSIONS

Los permisos deben ser granulares.

Conceptualmente:

```text
resource.action
```

Ejemplos:

```text
pet.read
pet.update
pet.manage_guardians
case.create
case.update
alert.approve
organization.manage_members
```

El frontend nunca debe considerarse una frontera de seguridad.

Que un botón no aparezca no significa que una operación sea segura.

La seguridad debe validarse en backend y/o Firestore Rules.

---

# 25. SCOPES

Los permisos pueden estar limitados por alcance.

Conceptualmente:

```text
GLOBAL
COUNTRY
REGION
CITY
ORGANIZATION
```

Un permiso puede tener:

```text
scopeType
scopeId
```

Esto permitirá evolucionar hacia una plataforma internacional sin tener que rediseñar el modelo de autorización.

---

# 26. CUSTOM CLAIMS

Custom Claims deben contener solamente información apropiada para identidad y autorización de alto nivel.

No deben utilizarse para:

* almacenar todas las memberships;
* almacenar todas las relaciones;
* almacenar grandes listas de permisos;
* almacenar datos de negocio.

Las relaciones complejas deben resolverse mediante Firestore y/o backend confiable.

---

# 27. TRUSTED BACKEND

Operaciones sensibles deberán poder ejecutarse mediante un backend confiable.

Ejemplos:

```text
alert.approve
alert.reject
organization.manage.members
credential.resolve
security-sensitive events
```

El backend debe validar:

1. identidad;
2. rol;
3. relación;
4. permiso;
5. scope;
6. estado del recurso.

---

# 28. APP CHECK

App Check debe entenderse como una capa de protección contra abuso.

No reemplaza la autorización.

Conceptualmente:

```text
Authentication ≠ Authorization
App Check ≠ Authorization
```

App Check ayuda a proteger el acceso contra abuso, pero no decide quién puede realizar una operación.

---

# 29. AUDIT LOG

PawFinds debe tener una capacidad de auditoría.

Conceptualmente:

```text
audit_logs/{logId}
```

Puede registrar:

* actorId;
* action;
* targetId;
* targetType;
* before;
* after;
* reason;
* timestamp;
* scope.

Los audit logs deben ser append-only.

El frontend no debe poder modificar arbitrariamente los registros de auditoría.

---

# 30. VERIFICATION

Debe mantenerse una separación conceptual entre:

```text
IDENTITY
VERIFICATION
PERMISSIONS
REPUTATION
MODERATION
```

Tener una identidad no significa automáticamente estar verificado.

Estar verificado no significa automáticamente tener permisos administrativos.

Tener reputación no reemplaza la verificación.

La moderación es una capacidad independiente.

---

# 31. PRIVACY

La privacidad debe formar parte del diseño desde el principio.

Niveles conceptuales:

```text
PUBLIC
PRIVATE
SHARED
MEDICAL
EMERGENCY
ADMIN
```

La información sensible debe estar separada.

Especialmente:

* dirección exacta;
* información médica;
* datos personales;
* ubicación precisa;
* información privada de responsables.

La exposición pública debe seguir políticas explícitas.

---

# 32. NOTIFICATIONS

Las futuras notificaciones pueden originarse por:

* medicamentos;
* vacunas;
* tratamientos;
* citas veterinarias;
* documentos por vencer;
* GPS;
* zonas seguras;
* mascotas perdidas;
* avistamientos;
* emergencias;
* campañas;
* comunidad;
* organizaciones;
* viajes.

La arquitectura debe permitir que las notificaciones se conecten posteriormente al sistema de eventos.

---

# 33. COMMUNITY

La comunidad podrá evolucionar hacia:

* publicaciones;
* grupos;
* eventos;
* interacción entre usuarios;
* organizaciones;
* campañas;
* voluntariado;
* creadores;
* contenido relacionado con mascotas.

La comunidad no debe convertirse en el núcleo de identidad.

El núcleo debe continuar siendo la mascota y las relaciones alrededor de ella.

---

# 34. PAWFINDs AYUDA

PawFinds puede evolucionar hacia una capacidad de ayuda para necesidades relacionadas con mascotas.

Posibles casos:

* alimentación;
* tratamientos;
* rescates;
* necesidades veterinarias;
* refugios;
* campañas;
* casos especiales.

Esta capacidad podrá posteriormente conectarse con organizaciones, voluntarios, donaciones y patrocinadores.

---

# 35. COMERCIO Y SERVICIOS

El ecosistema podría incorporar posteriormente:

* productos;
* servicios;
* veterinarias;
* seguros;
* transporte;
* alojamiento;
* dispositivos;
* GPS;
* QR/NFC;
* profesionales;
* aliados comerciales.

No se debe implementar el modelo comercial completo antes de conocer los requisitos reales.

La arquitectura debe permitir incorporar estas capacidades posteriormente.

---

# 36. IA

La inteligencia artificial podrá convertirse en una capacidad transversal.

Posibles usos:

* asistente para usuarios;
* ayuda en casos;
* análisis de eventos;
* recordatorios;
* ayuda durante viajes;
* asistencia a organizaciones;
* búsqueda inteligente;
* automatización;
* clasificación;
* asistencia administrativa.

Principio:

> **La IA no es la fuente de verdad del sistema.**

Los datos oficiales deben permanecer en los sistemas centrales de PawFinds.

La IA puede interpretar, asistir y automatizar, pero no sustituir la fuente oficial.

---

# 37. ESCALABILIDAD

PawFinds debe diseñarse pensando desde el inicio en crecimiento internacional.

Esto incluye:

* separación de entidades;
* consultas eficientes;
* seguridad granular;
* geografía escalable;
* modularidad;
* documentación;
* eventos;
* auditoría;
* scopes;
* organizaciones;
* futuras aplicaciones móviles.

No significa implementar toda la infraestructura global inmediatamente.

Significa evitar decisiones que impidan llegar allí.

---

# 38. FIRESTORE — MODELO CONCEPTUAL

La arquitectura conceptual incluye:

```text
users/{uid}

organizations/{orgId}

memberships/{membershipId}

pet_guardians/{guardianId}

pet_public_profiles/{petId}

pet_emergency_profiles/{petId}

pets/{petId}/private/...

pets/{petId}/medical/...

pet_ids/{pawfindsPetId}

credentials/{credentialId}

devices/{deviceId}

cases/{caseId}

alerts/{alertId}

events/{eventId}

travel/...
```

Este modelo es conceptual.

El diseño técnico definitivo de colecciones, campos, índices y subcolecciones se definirá en el Technical Design correspondiente.

---

# 39. COMPATIBILIDAD CON EL PAWFINDs ACTUAL

El sistema actual de alertas no debe eliminarse mientras se construye la nueva infraestructura.

Actualmente existe:

```text
alerts
```

con el flujo:

```text
create
 ↓
pending
 ↓
moderation
 ↓
approved / rejected
```

La nueva arquitectura debe coexistir inicialmente con este sistema.

Posteriormente se podrá migrar progresivamente:

```text
Current alerts
      ↓
Migration Layer
      ↓
Cases + Alerts + Pets
```

No se debe romper la funcionalidad existente sin una estrategia de migración.

---

# 40. PRINCIPIO DE MIGRACIÓN

Las nuevas capacidades deben incorporarse de forma incremental.

No se debe intentar reconstruir PawFinds completamente de una sola vez.

La evolución debe seguir:

```text
CURRENT SYSTEM
      ↓
FOUNDATION
      ↓
NEW CORE
      ↓
MIGRATION
      ↓
EXPANSION
```

Esto permite mantener el sistema funcional mientras crece.

---

# 41. ROADMAP CONCEPTUAL

```text
v0.1  Prototype
v0.2  Firebase / Auth / Firestore
v0.3  Moderation
v0.3.5 Architecture / Admin Design
v0.4  Identity + Security + Pet Core
v0.5  Real GPS
v0.6  Storage
v0.7  Profiles / Organizations
v0.8  Chat
v0.9  Community
v1.0  Real Platform

Future:

v1.1  Pet ID / QR / NFC
v1.2  Devices / GPS Ecosystem
v1.3  Events / Notifications
v1.4  Travel
v2.x  Ecosystem / Partners / Services
```

---

# 42. v0.4 — FOUNDATION

La siguiente gran etapa es:

> **FOUNDATION OF IDENTITY + SECURITY + PET CORE**

El alcance conceptual de v0.4 incluye:

### Authentication / User Foundation

* identidad;
* usuario;
* base de roles.

### Pet Foundation

* creación de mascota;
* identidad interna;
* perfil base.

### Pet ID Foundation

* `petId`;
* `pawfindsPetId`.

### Pet Public Profile Foundation

* información pública separada.

### Pet Emergency Profile Foundation

* estructura de exposición de emergencia.

### Pet Guardians Foundation

* relaciones;
* ReBAC;
* roles;
* permisos básicos.

### Organization & Membership Foundation

* organizaciones;
* memberships;
* roles organizacionales.

### Event Foundation

* esquema general de eventos.

### Security Foundation

* reglas básicas;
* separación de responsabilidades;
* base para backend confiable.

---

# 43. EXCLUSIONES DE v0.4

No forman parte de la implementación inicial de v0.4:

```text
Real GPS
Real active devices
Physical QR/NFC
QR/NFC resolver routing
Full Medical system
Functional Travel
Notifications engine
Chat
Community
Real payments
Real donations
Marketplace
Full Event/Rule/Action engine
```

Estas capacidades están contempladas en la arquitectura, pero se implementarán posteriormente.

---

# 44. DECISIONES ARQUITECTÓNICAS CERRADAS

Las siguientes decisiones se consideran aprobadas:

### 1. Separación de identificadores

```text
petId
pawfindsPetId
credentialId
deviceId
```

son conceptos diferentes.

### 2. Guardians mediante relaciones

La relación mascota-persona-organización se representa mediante `pet_guardians`.

### 3. Public / Emergency / Private / Medical separados

No se concentrará toda la información de una mascota en un único documento.

### 4. Emergency exposure mediante política

La exposición de información de emergencia se controla mediante una política explícita y futura resolución confiable.

### 5. Events generalizados

Los eventos utilizan:

```text
targetType
targetId
```

y pueden representar diferentes tipos de recursos.

### 6. Backend confiable

Las operaciones privilegiadas pueden requerir Cloud Functions o infraestructura equivalente.

### 7. App Check no sustituye autorización

App Check es una capa anti-abuso, no un sistema de permisos.

### 8. Estados independientes

Pet, Case, Alert y Device mantienen sus propios estados.

---

# 45. DECISIONES AÚN ABIERTAS

Todavía no se han cerrado:

1. estrategia exacta de indexación geoespacial;
2. límite exacto entre Firestore Rules y Cloud Functions;
3. diseño futuro del Event Engine;
4. modelos comerciales;
5. integraciones externas;
6. proveedores de dispositivos;
7. infraestructura definitiva de notificaciones.

Estas decisiones se tomarán cuando exista información técnica suficiente.

---

# 46. DOCUMENTACIÓN COMO INFRAESTRUCTURA

PawFinds no debe depender de la memoria de una IA.

Las decisiones importantes deben quedar documentadas dentro del proyecto.

Estructura prevista:

```text
/docs

  README.md

  architecture/
    system-overview.md
    data-model.md
    security.md
    permissions.md
    organizations.md
    geography.md
    scalability.md
    pet-core.md
    pet-id.md
    devices.md
    events.md
    travel.md

  decisions/
    ADR-001-firebase.md
    ADR-002-user-identity.md
    ADR-003-organizations.md
    ADR-004-admin-center.md
    ADR-005-pet-core.md
    ADR-006-pet-id.md
    ADR-007-devices.md
    ADR-008-events.md
    ADR-009-travel.md

  security/
    roles.md
    permissions.md
    firestore-rules.md
    audit-log.md

  roadmap/
    current.md
    future.md
    releases.md
```

El documento actual:

```text
/docs/VISION/PAWFINDs-Master-Blueprint-v1.4.md
```

representa la visión y arquitectura conceptual principal.

---

# 47. REGLA DE ORO DEL PROYECTO

Toda nueva funcionalidad debe responder:

1. ¿Qué entidad representa?
2. ¿Qué relación tiene con las entidades existentes?
3. ¿Qué eventos genera?
4. ¿Quién puede acceder?
5. ¿Qué permisos requiere?
6. ¿Cuál es su scope?
7. ¿Qué información es pública?
8. ¿Qué información es privada?
9. ¿Cómo escala?
10. ¿Cómo se documentará?

Si una funcionalidad no puede responder estas preguntas, debe analizarse antes de implementarse.

---

# 48. PRINCIPIO FINAL

PawFinds no se construirá como una colección de funciones independientes.

Se construirá como un ecosistema.

```text
                    PAWFINDs
                       │
        ┌──────────────┼──────────────┐
        │              │              │
       PET          PEOPLE      ORGANIZATIONS
        │              │              │
        ├──────────────┼──────────────┤
        │              │              │
      CASES         EVENTS        SERVICES
        │              │              │
      ALERTS       NOTIFICATIONS   COMMUNITY
        │              │              │
        ├──────────────┼──────────────┤
        │              │              │
      HEALTH        DEVICES        TRAVEL
        │              │              │
        └──────────────┼──────────────┘
                       │
                    PAWFINDs
                    ECOSYSTEM
```

La visión final es construir una infraestructura digital en la que la mascota sea el centro y donde rescate, identidad, seguridad, salud, comunidad, dispositivos, servicios, organizaciones y futuras capacidades puedan conectarse alrededor de ella.

> **PawFinds comienza resolviendo el problema de las mascotas perdidas, pero su arquitectura se diseña para acompañar la vida completa de una mascota.**

---

**Estado del documento:** 🟢 BASE CONCEPTUAL APROBADA
**Próximo documento:** `Technical Design v0.4`
**Regla:** No implementar cambios estructurales importantes sin contrastarlos primero con este Blueprint.
