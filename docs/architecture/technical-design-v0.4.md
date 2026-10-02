# PAWFINDs

## Technical Design v0.4

**Estado:** 🟡 En diseño
**Versión:** 0.4
**Tipo:** Especificación técnica de implementación
**Documento superior:** `docs/VISION/PAWFINDs-Master-Blueprint-v1.4.md`

---

# 1. PROPÓSITO

Este documento transforma la visión y arquitectura conceptual definida en:

`PAWFINDs-Master-Blueprint-v1.4.md`

en una especificación técnica para la implementación de PawFinds v0.4.

El objetivo de este documento es definir:

* estructura de datos;
* entidades;
* relaciones;
* permisos;
* seguridad;
* responsabilidades del frontend;
* responsabilidades del backend;
* convivencia con el sistema actual;
* estrategia de migración;
* pruebas;
* límites de implementación.

Este documento debe completarse y revisarse antes de realizar cambios estructurales importantes en el código de PawFinds.

---

# 2. PRINCIPIOS DE IMPLEMENTACIÓN

La implementación de v0.4 seguirá estos principios:

### 2.1 No romper el sistema actual

El sistema actual de alertas debe continuar funcionando mientras se introduce la nueva infraestructura.

### 2.2 Separación de responsabilidades

Cada entidad debe tener una responsabilidad clara.

No se deben crear documentos gigantes que contengan información de diferentes dominios.

### 2.3 Seguridad desde el diseño

Los permisos no se implementarán únicamente mediante controles visuales del frontend.

La autorización debe validarse mediante Firestore Rules y/o backend confiable.

### 2.4 Relaciones explícitas

Las relaciones importantes entre usuarios, mascotas y organizaciones deben representarse explícitamente.

### 2.5 Identidad estable

La mascota debe tener un identificador interno estable:

`petId`

El identificador público del ecosistema:

`pawfindsPetId`

debe mantenerse conceptualmente separado.

### 2.6 Privacidad por separación de datos

La información pública, de emergencia, privada y médica debe permanecer separada.

### 2.7 Evolución incremental

v0.4 construirá únicamente la infraestructura necesaria para la siguiente etapa.

No se implementarán prematuramente GPS real, dispositivos físicos, marketplace, pagos, chat, comunidad completa ni otros módulos futuros.

---

# 3. ALCANCE DE v0.4

## Incluido

```text
Authentication / User Foundation
Pet Foundation
Pet ID Foundation
Pet Public Profile Foundation
Pet Emergency Profile Foundation
Pet Guardians Foundation
Organization Foundation
Membership Foundation
Event Foundation
Security Foundation
```

## No incluido

```text
Real GPS
Physical QR/NFC
QR/NFC resolver
Active device integrations
Full medical system
Functional travel
Notifications engine
Chat
Community
Payments
Donations
Marketplace
Full event/rule/action engine
```

---

# 4. ARQUITECTURA GENERAL

La arquitectura conceptual de v0.4 será:

```text
                    PAWFINDs
                       │
                       ▼
                Firebase Auth
                       │
                       ▼
                  User Identity
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
          RBAC                 ReBAC
             │                   │
             └─────────┬─────────┘
                       ▼
                  Permissions
                       │
                       ▼
                     Scope
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
        Firestore Rules    Trusted Backend
              │                 │
              └────────┬────────┘
                       ▼
                 PAWFINDs DATA
```

---

# 5. ENTIDADES DE v0.4

Las entidades principales serán:

```text
USER
ORGANIZATION
MEMBERSHIP
PET
PET GUARDIAN
PAWFINDs PET ID
PET PUBLIC PROFILE
PET EMERGENCY PROFILE
EVENT
```

Además, se mantendrán las entidades existentes necesarias para la compatibilidad:

```text
ALERT
```

Las entidades futuras como `DEVICE`, `TRAVEL`, `CREDENTIAL`, `CASE` y `MEDICAL` se prepararán conceptualmente, pero no necesariamente se implementarán funcionalmente en esta etapa.

---

# 6. FIRESTORE — COLECCIONES PRINCIPALES

La estructura inicial prevista será:

```text
users/{uid}

organizations/{orgId}

memberships/{membershipId}

pets/{petId}

pet_guardians/{guardianId}

pet_ids/{pawfindsPetId}

pet_public_profiles/{petId}

pet_emergency_profiles/{petId}

events/{eventId}

alerts/{alertId}
```

Esta estructura es preliminar.

Los campos definitivos, tipos, índices y reglas se especificarán en las siguientes secciones del documento.

---

# 7. USER

## Colección

```text
users/{uid}
```

## Propósito

Representar la identidad y perfil básico del usuario dentro de PawFinds.

La identidad de autenticación procede de Firebase Authentication.

Firestore contiene información de aplicación asociada al usuario.

## Principio

El documento de usuario no debe convertirse en un contenedor de todas las relaciones del usuario.

No se deben almacenar dentro de `users/{uid}`:

* todas las mascotas;
* todas las memberships;
* todos los permisos;
* todas las organizaciones;
* información médica;
* grandes listas de relaciones.

Las relaciones deben representarse mediante entidades independientes.

---

# 8. PET

## Colección

```text
pets/{petId}
```

## Propósito

Representar la identidad interna de una mascota.

## Identificador

El ID del documento:

```text
petId
```

será el identificador interno estable.

## Principios

`petId`:

* debe ser estable;
* debe ser único;
* no debe reutilizarse;
* no debe depender del nombre de la mascota;
* no debe depender del usuario propietario;
* no debe cambiar cuando cambie el responsable;
* no debe cambiar si cambia un QR;
* no debe cambiar si cambia un dispositivo.

La mascota existe independientemente de sus credenciales, dispositivos o relaciones.

---

# 9. PAWFINDs PET ID

## Colección

```text
pet_ids/{pawfindsPetId}
```

## Propósito

Representar la identidad pública persistente de una mascota dentro del ecosistema PawFinds.

La relación será conceptualmente:

```text
pawfindsPetId
      │
      ▼
   petId
      │
      ▼
    PET
```

El `pawfindsPetId` no reemplaza al `petId`.

## Regla

Las entidades internas deben relacionarse principalmente mediante `petId`.

El identificador público no debe convertirse en el ancla interna del sistema.

---

# 10. PET PUBLIC PROFILE

## Colección

```text
pet_public_profiles/{petId}
```

## Propósito

Contener información autorizada para exposición pública.

## Principio de seguridad

La información pública debe estar separada de:

```text
private
medical
emergency
```

Firestore Rules no deben depender de ocultar campos individuales dentro de un documento público.

---

# 11. PET EMERGENCY PROFILE

## Colección

```text
pet_emergency_profiles/{petId}
```

## Propósito

Contener información que pueda resultar útil en situaciones de emergencia.

La exposición dependerá de una política explícita.

Campos conceptuales:

```text
enabled
visibility
allowedContexts
updatedAt
```

El sistema no debe asumir que la existencia de estos campos significa automáticamente que una persona está autorizada.

La futura resolución de QR/NFC deberá realizarse mediante un mecanismo confiable.

---

# 12. PET GUARDIANS

## Colección

```text
pet_guardians/{guardianId}
```

## Propósito

Representar relaciones entre una mascota y usuarios u organizaciones.

Ejemplos de roles:

```text
OWNER
CO_OWNER
CAREGIVER
VETERINARIAN
EMERGENCY_CONTACT
AUTHORIZED_ORGANIZATION
```

La relación puede incluir:

```text
petId
userId
organizationId
role
permissions
status
scope
createdAt
expiresAt
```

No todas las relaciones necesitan utilizar todos los campos.

La estructura definitiva se determinará en el diseño de datos.

---

# 13. ORGANIZATION

## Colección

```text
organizations/{orgId}
```

## Propósito

Representar una organización como entidad independiente.

Ejemplos:

* refugio;
* fundación;
* veterinaria;
* organización de rescate;
* empresa;
* aliado.

Una organización no es un rol.

---

# 14. MEMBERSHIP

## Colección

```text
memberships/{membershipId}
```

## Propósito

Representar la relación entre un usuario y una organización.

Conceptualmente:

```text
USER
 │
 ▼
MEMBERSHIP
 │
 ▼
ORGANIZATION
```

Una misma persona puede tener diferentes roles en diferentes organizaciones.

Las memberships no deben almacenarse masivamente dentro de Custom Claims.

---

# 15. EVENT

## Colección

```text
events/{eventId}
```

## Propósito

Crear la base para un sistema de eventos transversal.

Estructura conceptual:

```text
eventId
eventType
source
actorId
targetType
targetId
timestamp
visibility
metadata
scope
```

Los eventos podrán apuntar a:

```text
USER
PET
CASE
ALERT
DEVICE
ORGANIZATION
CREDENTIAL
TRAVEL
```

En v0.4 se implementará únicamente la infraestructura básica del evento.

No se implementará todavía un motor:

```text
EVENT → RULE → ACTION → NOTIFICATION
```

---

# 16. ALERTS EXISTENTES

La colección actual:

```text
alerts/{alertId}
```

debe mantenerse durante v0.4.

El sistema actual continuará utilizando su flujo existente:

```text
CREATE
   ↓
PENDING
   ↓
MODERATION
   ↓
APPROVED / REJECTED
```

No se debe eliminar ni reemplazar inmediatamente.

La migración hacia:

```text
PET
 ↓
CASE
 ↓
ALERT
```

se realizará posteriormente y deberá tener una estrategia específica.

---

# 17. CASE

`CASE` forma parte de la arquitectura conceptual de PawFinds.

Sin embargo, para v0.4 se debe decidir explícitamente si se:

1. crea solamente la estructura mínima;
2. crea la colección pero sin migrar las alertas existentes;
3. o se posterga completamente.

La implementación no debe comenzar hasta cerrar esta decisión.

---

# 18. RELACIONES PRINCIPALES

Las relaciones fundamentales son:

```text
USER
 │
 ├──── MEMBERSHIP ──── ORGANIZATION
 │
 └──── PET GUARDIAN ──── PET
                              │
                              ├── PAWFINDs PET ID
                              │
                              ├── PUBLIC PROFILE
                              │
                              ├── EMERGENCY PROFILE
                              │
                              └── EVENTS
```

La relación:

```text
PET → CASE → ALERT
```

queda preparada para la evolución posterior.

---

# 19. MODELO DE AUTORIZACIÓN

La autorización utilizará conceptualmente:

```text
Authentication
      ↓
Identity
      ↓
RBAC
      +
ReBAC
      ↓
Permission
      ↓
Scope
      ↓
Authorization
```

## RBAC

Determina capacidades asociadas al rol.

## ReBAC

Determina acceso basado en relaciones.

Ejemplo:

```text
User A
  ↓
OWNER
  ↓
Pet B
```

El acceso de User A sobre Pet B puede depender de esa relación.

---

# 20. PERMISOS

Los permisos seguirán el formato conceptual:

```text
resource.action
```

Ejemplos:

```text
pet.read
pet.create
pet.update
pet.manage_guardians

case.create
case.update

alert.create
alert.approve
alert.reject

organization.read
organization.update
organization.manage_members
```

Los permisos definitivos se documentarán en la matriz de autorización.

---

# 21. SCOPES

Los permisos podrán tener alcance:

```text
GLOBAL
COUNTRY
REGION
CITY
ORGANIZATION
```

El alcance puede representarse mediante:

```text
scopeType
scopeId
```

No todas las operaciones necesitarán un scope explícito.

---

# 22. CUSTOM CLAIMS

Custom Claims tendrán una función limitada.

Podrán utilizarse para información compacta necesaria para autorización de alto nivel.

No deberán contener:

* todas las mascotas del usuario;
* todas las memberships;
* grandes listas de permisos;
* relaciones complejas;
* información de negocio.

La información relacional permanecerá en Firestore o será consultada por backend confiable.

---

# 23. FIRESTORE RULES

Firestore Rules serán una capa de autorización.

No deben depender exclusivamente de:

```text
frontend visibility
button visibility
JavaScript checks
```

El cliente nunca debe considerarse una frontera de seguridad.

Las Rules deberán evolucionar desde las reglas temporales actuales hacia reglas basadas en:

* identidad;
* propiedad;
* relación;
* rol;
* permiso;
* scope;
* estado del recurso.

---

# 24. TRUSTED BACKEND

Cloud Functions o backend confiable se utilizarán cuando una operación:

* sea administrativa;
* implique múltiples validaciones;
* requiera lógica compleja;
* necesite escritura privilegiada;
* necesite generar eventos confiables;
* requiera operaciones que no deban quedar bajo control directo del cliente.

Ejemplos futuros:

```text
alert.approve
alert.reject
organization.manage_members
credential.resolve
security-sensitive events
```

La frontera exacta entre Firestore Rules y backend será definida antes de implementar cada operación.

---

# 25. AUDIT

Las operaciones administrativas y sensibles deberán poder generar registros de auditoría.

Conceptualmente:

```text
audit_logs/{logId}
```

con:

```text
actorId
action
targetId
targetType
before
after
reason
timestamp
scope
```

El sistema de auditoría debe ser append-only.

La escritura arbitraria desde el frontend no debe permitirse.

---

# 26. PRIVACIDAD

Los datos deben clasificarse conceptualmente como:

```text
PUBLIC
PRIVATE
SHARED
MEDICAL
EMERGENCY
ADMIN
```

No se debe almacenar información sensible en documentos públicos.

Especial atención:

* dirección;
* ubicación exacta;
* información médica;
* información personal;
* contactos privados.

---

# 27. FRONTEND VS BACKEND

## Frontend

Puede:

* mostrar información;
* solicitar operaciones;
* crear recursos permitidos;
* actualizar información autorizada;
* escuchar cambios permitidos.

## Backend / Rules

Debe:

* validar autorización;
* proteger operaciones privilegiadas;
* validar relaciones;
* validar roles;
* validar scopes;
* proteger información sensible;
* generar operaciones confiables.

---

# 28. MIGRACIÓN DEL SISTEMA ACTUAL

La infraestructura nueva debe coexistir inicialmente con:

```text
alerts
```

No se realizará una migración destructiva.

La estrategia general será:

```text
CURRENT PAWFINDs
       │
       ▼
NEW FOUNDATION
       │
       ▼
COEXISTENCE
       │
       ▼
MIGRATION
       │
       ▼
FUTURE MODEL
```

La migración concreta de `alerts` será diseñada después de definir completamente `CASE`.

---

# 29. REGLA DE NO REGRESIÓN

Durante v0.4:

* el formulario actual no debe romperse;
* el sistema actual de alertas debe seguir funcionando;
* la moderación existente debe seguir funcionando;
* la interfaz actual debe mantenerse;
* no se deben introducir cambios visuales innecesarios;
* no se deben eliminar funcionalidades existentes sin plan de migración.

---

# 30. ORDEN DE IMPLEMENTACIÓN

La implementación prevista será:

```text
TECHNICAL DESIGN
        ↓
FIRESTORE SCHEMA
        ↓
SECURITY MODEL
        ↓
FIRESTORE RULES
        ↓
AUTH / USER
        ↓
PET CORE
        ↓
PET ID
        ↓
PET PUBLIC PROFILE
        ↓
PET EMERGENCY PROFILE
        ↓
PET GUARDIANS
        ↓
ORGANIZATIONS
        ↓
MEMBERSHIPS
        ↓
EVENT FOUNDATION
        ↓
TESTING
        ↓
AUDIT
```

No se debe saltar directamente al código.

---

# 31. METODOLOGÍA DE VALIDACIÓN

Cada módulo deberá pasar por:

```text
DESIGN
 ↓
REVIEW
 ↓
APPROVAL
 ↓
IMPLEMENTATION
 ↓
TEST
 ↓
AUDIT
 ↓
DOCUMENTATION
```

Estados utilizados:

```text
🟢 APPROVED
🟡 OBSERVATION
🔴 PROBLEM
🔵 DECISION PENDING
```

---

# 32. TESTING

Cada entidad deberá tener pruebas para:

### Authentication

* usuario autenticado;
* usuario no autenticado;
* creación de perfil.

### Pet

* creación;
* lectura;
* actualización;
* acceso no autorizado.

### Guardians

* owner;
* caregiver;
* veterinario;
* usuario sin relación.

### Organizations

* miembro;
* no miembro;
* administrador;
* usuario externo.

### Security

* lectura permitida;
* lectura denegada;
* escritura permitida;
* escritura denegada;
* escalamiento de privilegios;
* modificación de campos protegidos.

### Regression

* creación de alertas;
* aprobación;
* rechazo;
* visualización pública;
* sincronización en tiempo real.

---

# 33. CRITERIOS DE ACEPTACIÓN DE v0.4

v0.4 podrá considerarse técnicamente preparada para la siguiente etapa cuando:

* la identidad de usuario esté definida;
* `petId` esté implementado correctamente;
* `pawfindsPetId` esté separado;
* exista Pet Foundation;
* exista Public Profile separado;
* exista Emergency Profile separado;
* exista Pet Guardian;
* exista Organization Foundation;
* exista Membership Foundation;
* exista Event Foundation;
* las reglas básicas estén probadas;
* las operaciones privilegiadas estén protegidas;
* el sistema actual de `alerts` continúe funcionando;
* exista una estrategia de migración;
* exista documentación suficiente para continuar sin depender de memoria externa.

---

# 34. ESTADO ACTUAL DEL DOCUMENTO

Este documento se encuentra:

> 🟡 **EN DISEÑO**

Las siguientes secciones deben definirse antes de implementación:

```text
1. Campos exactos de cada colección
2. Tipos de datos
3. Relaciones exactas
4. Índices Firestore
5. Matriz de permisos
6. Roles
7. Scopes
8. Custom Claims
9. Firestore Rules
10. Cloud Functions / Trusted Backend
11. Estrategia exacta de CASE
12. Estrategia de migración de ALERTS
13. Plan de pruebas
```

No debe considerarse terminado hasta que estas decisiones hayan sido revisadas.

---

# 35. REGLA FINAL

Este documento no debe convertirse en código.

Su función es responder:

> **“¿Cómo debe estar construido PawFinds antes de comenzar a programar esta etapa?”**

El código se escribirá únicamente después de que la decisión técnica correspondiente haya sido aprobada.

---

**Documento superior:** `PAWFINDs-Master-Blueprint-v1.4.md`

**Siguiente fase:** Firestore Schema + Data Model
# 36. FIRESTORE SCHEMA & DATA MODEL

Esta sección define la estructura técnica inicial de datos para PawFinds v0.4.

El esquema debe respetar el principio:

> **Una entidad representa una responsabilidad concreta.**

No se deben crear documentos gigantes que mezclen identidad, relaciones, permisos, salud, emergencias y datos públicos.

---

# 37. USERS

## Collection

```text
users/{uid}
```

## Propósito

Representar el perfil de aplicación asociado a una identidad autenticada.

## Campos

| Campo         | Tipo      | Requerido | Descripción                    |
| ------------- | --------- | --------: | ------------------------------ |
| `uid`         | string    |        Sí | UID de Firebase Authentication |
| `displayName` | string    |        No | Nombre visible                 |
| `email`       | string    |        No | Correo asociado                |
| `photoURL`    | string    |        No | URL de fotografía              |
| `status`      | string    |        Sí | Estado del usuario             |
| `createdAt`   | timestamp |        Sí | Fecha de creación              |
| `updatedAt`   | timestamp |        Sí | Última actualización           |

## Estados iniciales

```text
ACTIVE
SUSPENDED
DISABLED
```

### Regla

El `uid` de Firebase Auth es la identidad principal.

El frontend no debe poder modificar arbitrariamente:

```text
uid
createdAt
```

---

# 38. PETS

## Collection

```text
pets/{petId}
```

## Propósito

Representar la identidad interna y estable de una mascota.

## Campos

| Campo       | Tipo      | Requerido | Descripción          |
| ----------- | --------- | --------: | -------------------- |
| `status`    | string    |        Sí | Estado de la mascota |
| `species`   | string    |        Sí | Especie              |
| `createdAt` | timestamp |        Sí | Creación             |
| `updatedAt` | timestamp |        Sí | Última actualización |
| `createdBy` | string    |        Sí | UID creador          |

## Estados iniciales

```text
ACTIVE
DECEASED
UNKNOWN
```

### Importante

El documento `pets/{petId}` no debe convertirse en el perfil completo de la mascota.

Los datos públicos, emergencia, médicos y privados se almacenarán separadamente.

---

# 39. PET PUBLIC PROFILES

## Collection

```text
pet_public_profiles/{petId}
```

## Propósito

Información autorizada para exposición pública.

## Campos iniciales

| Campo         | Tipo      | Requerido | Descripción                  |
| ------------- | --------- | --------: | ---------------------------- |
| `petId`       | string    |        Sí | Referencia interna           |
| `name`        | string    |        No | Nombre de la mascota         |
| `breed`       | string    |        No | Raza                         |
| `sex`         | string    |        No | Sexo                         |
| `birthYear`   | number    |        No | Año aproximado de nacimiento |
| `description` | string    |        No | Descripción                  |
| `photoURL`    | string    |        No | Fotografía principal         |
| `visibility`  | string    |        Sí | Política de visibilidad      |
| `updatedAt`   | timestamp |        Sí | Última actualización         |

## Visibility inicial

```text
PUBLIC
SHARED
PRIVATE
```

### Regla

No almacenar aquí:

* dirección exacta;
* información médica;
* información privada del responsable;
* ubicación privada;
* credenciales;
* permisos.

---

# 40. PET EMERGENCY PROFILES

## Collection

```text
pet_emergency_profiles/{petId}
```

## Propósito

Información potencialmente útil en situaciones de emergencia.

## Campos

| Campo              | Tipo          | Requerido | Descripción                     |
| ------------------ | ------------- | --------: | ------------------------------- |
| `petId`            | string        |        Sí | Referencia interna              |
| `enabled`          | boolean       |        Sí | Perfil habilitado               |
| `visibility`       | string        |        Sí | Nivel de exposición             |
| `allowedContexts`  | array<string> |        No | Contextos permitidos            |
| `allergies`        | array<string> |        No | Alergias relevantes             |
| `medications`      | array<string> |        No | Medicamentos relevantes         |
| `specialNeeds`     | array<string> |        No | Necesidades especiales          |
| `behaviorNotes`    | string        |        No | Instrucciones de comportamiento |
| `dietNotes`        | string        |        No | Información alimentaria         |
| `emergencyContact` | map           |        No | Contacto autorizado             |
| `veterinarian`     | map           |        No | Veterinario autorizado          |
| `updatedAt`        | timestamp     |        Sí | Última actualización            |

### Nota de seguridad

Este documento contiene información potencialmente sensible.

Su acceso no debe depender únicamente de `visibility`.

Las reglas y el backend deberán determinar quién puede leerlo y bajo qué condiciones.

---

# 41. PET GUARDIANS

## Collection

```text
pet_guardians/{guardianId}
```

## Propósito

Representar una relación entre una mascota y una persona u organización.

## Campos

| Campo            | Tipo          | Requerido | Descripción               |
| ---------------- | ------------- | --------: | ------------------------- |
| `petId`          | string        |        Sí | Mascota relacionada       |
| `userId`         | string        |        No | Usuario relacionado       |
| `organizationId` | string        |        No | Organización relacionada  |
| `role`           | string        |        Sí | Rol de la relación        |
| `permissions`    | array<string> |        No | Permisos específicos      |
| `status`         | string        |        Sí | Estado de la relación     |
| `scopeType`      | string        |        No | Tipo de alcance           |
| `scopeId`        | string        |        No | Identificador del alcance |
| `createdAt`      | timestamp     |        Sí | Creación                  |
| `updatedAt`      | timestamp     |        Sí | Actualización             |
| `expiresAt`      | timestamp     |        No | Expiración                |

## Regla estructural

Debe existir al menos uno:

```text
userId
```

o:

```text
organizationId
```

No se debe permitir una relación sin sujeto.

## Roles iniciales

```text
OWNER
CO_OWNER
CAREGIVER
VETERINARIAN
EMERGENCY_CONTACT
AUTHORIZED_ORGANIZATION
```

## Estados

```text
ACTIVE
INACTIVE
EXPIRED
REVOKED
```

---

# 42. PAWFINDs PET ID

## Collection

```text
pet_ids/{pawfindsPetId}
```

## Propósito

Resolver un identificador público hacia una mascota interna.

## Campos

| Campo       | Tipo      | Requerido | Descripción              |
| ----------- | --------- | --------: | ------------------------ |
| `petId`     | string    |        Sí | Mascota interna          |
| `status`    | string    |        Sí | Estado del identificador |
| `createdAt` | timestamp |        Sí | Creación                 |
| `updatedAt` | timestamp |        Sí | Actualización            |

## Estados

```text
ACTIVE
SUSPENDED
REVOKED
```

### Regla

El `pawfindsPetId` debe ser único.

El `petId` permanece estable aunque el identificador público cambie en el futuro.

---

# 43. ORGANIZATIONS

## Collection

```text
organizations/{orgId}
```

## Campos

| Campo         | Tipo      | Requerido | Descripción          |
| ------------- | --------- | --------: | -------------------- |
| `name`        | string    |        Sí | Nombre               |
| `type`        | string    |        Sí | Tipo de organización |
| `status`      | string    |        Sí | Estado               |
| `countryCode` | string    |        No | País                 |
| `regionCode`  | string    |        No | Región               |
| `city`        | string    |        No | Ciudad               |
| `createdBy`   | string    |        Sí | Usuario creador      |
| `createdAt`   | timestamp |        Sí | Creación             |
| `updatedAt`   | timestamp |        Sí | Actualización        |

## Estados

```text
ACTIVE
SUSPENDED
DISABLED
```

## Tipos iniciales

```text
SHELTER
FOUNDATION
VETERINARY
RESCUE
BUSINESS
COMMUNITY
OTHER
```

---

# 44. MEMBERSHIPS

## Collection

```text
memberships/{membershipId}
```

## Campos

| Campo            | Tipo          | Requerido | Descripción                |
| ---------------- | ------------- | --------: | -------------------------- |
| `organizationId` | string        |        Sí | Organización               |
| `userId`         | string        |        Sí | Usuario                    |
| `role`           | string        |        Sí | Rol dentro de organización |
| `status`         | string        |        Sí | Estado                     |
| `permissions`    | array<string> |        No | Permisos adicionales       |
| `scopeType`      | string        |        No | Tipo de alcance            |
| `scopeId`        | string        |        No | Alcance                    |
| `createdAt`      | timestamp     |        Sí | Creación                   |
| `updatedAt`      | timestamp     |        Sí | Actualización              |
| `expiresAt`      | timestamp     |        No | Expiración                 |

## Estados

```text
PENDING
ACTIVE
SUSPENDED
REVOKED
EXPIRED
```

## Roles iniciales

```text
MEMBER
MANAGER
ADMIN
```

Los roles organizacionales son independientes de los roles de plataforma.

---

# 45. EVENTS

## Collection

```text
events/{eventId}
```

## Campos

| Campo        | Tipo      | Requerido | Descripción                     |
| ------------ | --------- | --------: | ------------------------------- |
| `eventType`  | string    |        Sí | Tipo de evento                  |
| `source`     | string    |        Sí | Origen                          |
| `actorId`    | string    |        No | Usuario o sistema que lo generó |
| `targetType` | string    |        Sí | Tipo de entidad                 |
| `targetId`   | string    |        Sí | ID de entidad                   |
| `timestamp`  | timestamp |        Sí | Momento del evento              |
| `visibility` | string    |        Sí | Nivel de exposición             |
| `metadata`   | map       |        No | Datos adicionales               |
| `scopeType`  | string    |        No | Alcance                         |
| `scopeId`    | string    |        No | ID del alcance                  |

## Target Types

```text
USER
PET
CASE
ALERT
DEVICE
ORGANIZATION
CREDENTIAL
TRAVEL
```

## Principio

Los eventos importantes relacionados con seguridad o administración deberán generarse mediante mecanismos confiables.

El cliente no debe poder fabricar libremente eventos de seguridad.

---

# 46. ALERTS — SISTEMA ACTUAL

La colección existente:

```text
alerts/{alertId}
```

se mantiene durante v0.4.

Los campos actuales no serán modificados automáticamente como parte de este documento.

La estructura existente continuará funcionando hasta que exista una estrategia de migración aprobada.

### Estado actual conocido

```text
status:
pending
approved
rejected
```

La futura arquitectura podrá añadir:

```text
resolved
```

pero esto debe revisarse antes de modificar la estructura actual.

---

# 47. CASES

## Estado

🔵 DECISIÓN PENDIENTE

La entidad conceptual:

```text
cases/{caseId}
```

debe existir en la arquitectura, pero todavía no se debe crear automáticamente.

Antes de implementarla debemos decidir:

* campos exactos;
* relación con `alerts`;
* migración;
* estados;
* permisos;
* si v0.4 incluye una implementación mínima.

---

# 48. DEVICES

## Estado

🔵 DECISIÓN PENDIENTE

La colección futura:

```text
devices/{deviceId}
```

no será implementada funcionalmente en v0.4.

Su diseño futuro deberá permitir:

* tipo de dispositivo;
* estado;
* petId;
* fabricante;
* modelo;
* integración;
* timestamps.

No se implementarán integraciones con fabricantes en esta etapa.

---

# 49. CREDENTIALS

## Estado

🔵 DECISIÓN PENDIENTE

La futura colección:

```text
credentials/{credentialId}
```

representará mecanismos como:

* QR;
* NFC;
* otros identificadores.

No se implementará el resolver QR/NFC en v0.4.

---

# 50. TRAVEL

## Estado

🔵 DECISIÓN PENDIENTE

Travel forma parte de la arquitectura futura.

No se implementará funcionalmente en v0.4.

---

# 51. TIPOS DE DATOS

Los tipos permitidos deberán seguir los tipos nativos de Firestore:

```text
string
number
boolean
timestamp
array
map
reference
null
```

No se deben almacenar fechas importantes como strings cuando corresponda utilizar `timestamp`.

---

# 52. TIMESTAMPS

Las fechas del sistema deberán utilizar timestamps de Firestore.

Campos comunes:

```text
createdAt
updatedAt
expiresAt
timestamp
```

Cuando corresponda, se utilizará:

```text
serverTimestamp()
```

para evitar depender del reloj del dispositivo del usuario.

---

# 53. IDENTIFICADORES

Los identificadores internos de documentos deben ser estables.

No utilizar:

* nombres;
* correos;
* teléfonos;
* datos geográficos;
* información editable

como identificadores primarios.

---

# 54. REFERENCIAS VS IDS

En v0.4 se priorizará almacenar IDs explícitos:

```text
petId
userId
organizationId
```

antes que crear una red excesiva de Firestore Document References.

Esto facilita:

* Rules;
* consultas;
* migraciones;
* integración con backend;
* interoperabilidad futura.

La decisión final sobre `DocumentReference` versus string ID se revisará caso por caso.

---

# 55. NORMALIZACIÓN

No duplicar información que pueda cambiar frecuentemente.

Ejemplo incorrecto:

```text
pet_guardians
    userName
    userEmail
    petName
```

La relación debe contener identificadores:

```text
petId
userId
```

y la información actualizada debe obtenerse de las entidades correspondientes.

---

# 56. DENORMALIZACIÓN CONTROLADA

Firestore puede requerir cierta duplicación para mejorar consultas.

Sin embargo, toda duplicación debe ser:

* intencional;
* documentada;
* justificable;
* mantenible.

No duplicar datos simplemente porque resulta cómodo desde el frontend.

---

# 57. REGLA DE PROPIEDAD

La propiedad de una mascota no debe inferirse únicamente por:

```text
createdBy
```

El sistema debe utilizar:

```text
pet_guardians
```

para representar relaciones actuales.

El creador de una mascota y el propietario actual pueden ser personas diferentes.

---

# 58. INTEGRIDAD DE RELACIONES

Antes de aceptar una relación:

```text
pet_guardians
```

el sistema deberá comprobar que:

* el pet existe;
* el usuario existe cuando corresponda;
* la organización existe cuando corresponda;
* el rol es válido;
* el estado es válido.

Las validaciones complejas podrán requerir backend confiable.

---

# 59. ÍNDICES

Los índices Firestore se definirán después de conocer las consultas reales.

No se crearán índices innecesarios solamente por anticipación.

Cada índice deberá responder a una consulta concreta.

Ejemplos futuros:

```text
pets by guardian
memberships by user
memberships by organization
events by target
events by timestamp
```

La lista definitiva de índices será documentada antes de producción.

---

# 60. CONSULTAS

La aplicación deberá evitar consultas que descarguen grandes cantidades de documentos innecesariamente.

Las consultas deberán utilizar:

* filtros;
* paginación;
* límites;
* ordenamiento;
* índices apropiados.

Especialmente en:

* alerts;
* events;
* memberships;
* organizaciones;
* futuras búsquedas geográficas.

---

# 61. ESCALABILIDAD DE ALERTS

El sistema actual utiliza:

```text
orderBy('createdAt', 'desc')
```

Esta estrategia funciona para el prototipo, pero no debe asumirse como solución global definitiva.

En una futura plataforma global será necesario:

* paginar;
* filtrar por región;
* consultar por viewport;
* utilizar índices;
* considerar clustering;
* evitar descargar todas las alertas.

---

# 62. COMPATIBILIDAD CON EL PROTOTIPO

Durante la transición:

```text
Prototype
     +
New Foundation
```

deben coexistir.

No se eliminará código funcional del prototipo sin:

1. identificar dependencia;
2. diseñar reemplazo;
3. probar reemplazo;
4. migrar;
5. eliminar código antiguo posteriormente.

---

# 63. REGLAS DE ESCRITURA

Cada colección deberá definir:

* quién puede crear;
* quién puede leer;
* quién puede actualizar;
* quién puede eliminar;
* qué campos puede modificar;
* cuándo requiere backend.

Esto se documentará en la matriz de permisos.

---

# 64. REGLAS DE BORRADO

Como principio general:

No se deben borrar entidades críticas de forma física cuando su historial tenga valor.

Dependiendo del dominio, puede utilizarse:

```text
status = DISABLED
```

o:

```text
status = REVOKED
```

o:

```text
status = DECEASED
```

en lugar de eliminar documentos.

El borrado físico deberá reservarse para casos específicamente justificados.

---

# 65. ESTADO DEL SCHEMA

Actualmente:

| Entidad               | Estado                |
| --------------------- | --------------------- |
| User                  | 🟢 Definición inicial |
| Pet                   | 🟢 Definición inicial |
| Pet Public Profile    | 🟢 Definición inicial |
| Pet Emergency Profile | 🟢 Definición inicial |
| Pet Guardian          | 🟢 Definición inicial |
| PawFinds Pet ID       | 🟢 Definición inicial |
| Organization          | 🟢 Definición inicial |
| Membership            | 🟢 Definición inicial |
| Event                 | 🟢 Definición inicial |
| Alerts                | 🟡 Compatibilidad     |
| Case                  | 🔵 Decisión pendiente |
| Device                | 🔵 Futuro             |
| Credential            | 🔵 Futuro             |
| Travel                | 🔵 Futuro             |

---

# 66. SIGUIENTE ETAPA

Antes de crear estas colecciones en Firebase debemos completar:

```text
Firestore Schema
       ↓
Permission Matrix
       ↓
Role Model
       ↓
Security Rules Design
       ↓
Backend Boundary
       ↓
Indexes
       ↓
Implementation
```

No se debe crear todavía la estructura definitiva en Firebase hasta completar la revisión de seguridad.
# PAWFINDs — Permission Matrix & Role Model v0.4

## 1. Propósito

Este documento define el modelo inicial de autorización de PAWFINDs para la versión v0.4.

Su objetivo es establecer, antes de implementar Firestore Rules:

* qué tipos de roles existen;
* qué relación tiene cada rol con los recursos;
* qué permisos puede ejercer cada rol;
* qué alcance puede tener cada permiso;
* qué operaciones pueden realizarse directamente desde el cliente;
* qué operaciones deberán ejecutarse mediante un entorno confiable;
* y qué principios deberán respetarse en futuras versiones.

Este documento complementa:

* `PAWFINDs — Vision & Master Blueprint v1.4`
* `PAWFINDs — Technical Design v0.4`
* `PAWFINDs — Firestore Schema & Data Model v0.4`

No constituye todavía una implementación de Firestore Rules.

---

# 2. Principio fundamental

PAWFINDs utilizará una combinación de:

```text
RBAC
+
ReBAC
+
Permissions
+
Scopes
```

Donde:

* **RBAC** determina qué puede hacer un rol.
* **ReBAC** determina qué relación tiene el usuario con el recurso.
* **Permission** determina la acción concreta permitida.
* **Scope** determina hasta dónde aplica esa autorización.

Modelo conceptual:

```text
USER
  ↓
IDENTITY
  ↓
PLATFORM ROLE
  +
ORGANIZATION MEMBERSHIP
  +
RESOURCE RELATIONSHIP
  ↓
PERMISSION
  ↓
SCOPE
  ↓
AUTHORIZATION DECISION
```

La interfaz nunca será considerada una frontera de seguridad.

---

# 3. Separación de conceptos

## 3.1 User

Representa la identidad autenticada.

```text
USER ≠ ROLE
```

Un usuario puede tener diferentes roles dependiendo del contexto.

Ejemplo:

```text
Usuario A
 ├── Platform Role: USER
 ├── Pet 1: OWNER
 ├── Pet 2: CAREGIVER
 └── Organization X: MANAGER
```

Por lo tanto, no debe asumirse que un único rol global describe todas las capacidades de un usuario.

---

# 4. Platform Roles

Los roles de plataforma representan capacidades generales dentro de PAWFINDs.

Roles iniciales:

```text
USER
MODERATOR
ADMIN
```

## USER

Usuario autenticado estándar.

Puede interactuar con recursos propios o con recursos sobre los cuales tenga una relación autorizada.

No implica automáticamente acceso a todas las mascotas, organizaciones o casos.

---

## MODERATOR

Rol de moderación.

Su función principal está relacionada con:

* revisión;
* moderación;
* aprobación;
* rechazo;
* gestión de contenido según el alcance asignado.

No implica automáticamente propiedad sobre mascotas.

Tampoco concede automáticamente acceso a información médica o privada.

---

## ADMIN

Rol administrativo de plataforma.

Puede poseer permisos administrativos superiores a los de un usuario normal y un moderador.

Sin embargo:

```text
ADMIN ≠ acceso ilimitado automático a información privada
```

Las operaciones administrativas sensibles deberán estar sujetas a permisos, alcance, auditoría y, cuando corresponda, Trusted Backend.

---

# 5. Organization Roles

Los roles de organización existen mediante `memberships`.

Roles iniciales:

```text
MEMBER
MANAGER
ADMIN
```

Estos roles no sustituyen los roles de plataforma.

Ejemplo:

```text
USER
+
Membership:
Organization = Refugio X
Role = MANAGER
```

El usuario puede administrar recursos de la organización según sus permisos y scope, sin convertirse por ello en `ADMIN` global de PAWFINDs.

---

# 6. Pet Relationship Roles

Los roles relacionados directamente con una mascota se almacenan mediante:

```text
pet_guardians/{guardianId}
```

Roles:

```text
OWNER
CO_OWNER
CAREGIVER
VETERINARIAN
EMERGENCY_CONTACT
AUTHORIZED_ORGANIZATION
```

Estos roles representan relaciones con una mascota específica.

Ejemplo:

```text
USER A
 └── PET 123
      └── OWNER
```

Otro ejemplo:

```text
USER B
 └── PET 123
      └── CAREGIVER
```

Por lo tanto:

```text
USER ROLE ≠ PET RELATIONSHIP ROLE
```

---

# 7. Permission Model

Los permisos deberán representar acciones concretas.

Formato conceptual:

```text
resource.action
```

Ejemplos:

```text
pet.create
pet.read
pet.update
pet.delete

pet_profile.read
pet_profile.update

pet_guardian.manage

pet_emergency.read
pet_emergency.update

organization.read
organization.manage

membership.manage

alert.create
alert.read
alert.update
alert.approve
alert.manage

event.read
event.create
```

Los nombres definitivos podrán ajustarse durante la implementación, pero deberán conservar una estructura consistente.

---

# 8. Scope Model

Un permiso no necesariamente significa acceso global.

Scopes iniciales:

```text
GLOBAL
COUNTRY
REGION
CITY
ORGANIZATION
RESOURCE
```

Ejemplo:

```text
MODERATOR
permission = alert.approve
scope = CITY
scopeId = Medellín
```

Ese permiso no debería convertirse automáticamente en:

```text
alert.approve
GLOBAL
```

---

# 9. Regla de precedencia conceptual

Para autorizar una operación deberá evaluarse:

```text
¿Quién es el usuario?
        ↓
¿Está autenticado?
        ↓
¿Qué rol tiene?
        ↓
¿Qué relación tiene con el recurso?
        ↓
¿Qué permiso posee?
        ↓
¿Qué scope tiene?
        ↓
¿La operación está permitida?
        ↓
¿Necesita Trusted Backend?
```

No debe existir una autorización basada únicamente en:

```text
"el botón está oculto"
```

ni:

```text
"el usuario conoce el ID"
```

ni:

```text
"el frontend dice que es admin"
```

---

# 10. Permission Matrix General

La siguiente matriz representa el comportamiento conceptual inicial.

| Rol          |           CREATE |                 READ |               UPDATE |        DELETE |          APPROVE |          MANAGE |
| ------------ | ---------------: | -------------------: | -------------------: | ------------: | ---------------: | --------------: |
| PUBLIC       |               🟡 |          🟢 limitado |                   🔴 |            🔴 |               🔴 |              🔴 |
| USER         |        🟢 propio |        🟢 autorizado | 🟢 propio/autorizado |            🟡 |               🔴 |              🟡 |
| OWNER        |               🟢 |                   🟢 |                   🟢 |            🟡 |               🔴 |      🟢 mascota |
| CO_OWNER     |               🟢 |                   🟢 |                   🟢 |            🟡 |               🔴 |      🟢 mascota |
| CAREGIVER    |               🟡 |        🟢 autorizado |        🟡 autorizado |            🔴 |               🔴 |              🟡 |
| VETERINARIAN |               🟡 | 🟢 médico autorizado |            🟡 médico |            🔴 |               🔴 |       🟡 médico |
| MODERATOR    |               🟡 |        🟢 moderación |        🟡 moderación | 🟡 moderación |               🟢 |   🟢 moderación |
| ORG MEMBER   |   🟢 según scope |      🟢 organización |      🟡 organización |         🔴/🟡 |               🟡 |              🔴 |
| ORG MANAGER  |  🟢 organización |      🟢 organización |      🟢 organización |            🟡 |               🟡 | 🟢 organización |
| ORG ADMIN    |  🟢 organización |      🟢 organización |      🟢 organización |            🟡 | 🟢 según permiso | 🟢 organización |
| ADMIN        | 🟢 según permiso |     🟢 según permiso |     🟢 según permiso |            🟡 | 🟢 según permiso |  🟢 según scope |

### Importante

Esta tabla no significa que cada rol tenga automáticamente todas las acciones marcadas como 🟢.

La autorización final dependerá también de:

```text
resource
+
relationship
+
permission
+
scope
+
resource state
```

---

# 11. Public Access

`PUBLIC` representa una persona no autenticada.

El acceso público deberá ser mínimo y explícito.

Puede existir acceso a:

```text
public pet profile
public alert
public organization profile
public campaign
public public information
```

No deberá tener acceso directo a:

```text
private user data
private pet data
medical records
guardian information
credentials
devices
internal moderation data
audit logs
permissions
memberships privadas
```

---

# 12. Owner

El `OWNER` representa la relación principal de responsabilidad sobre una mascota.

Puede gestionar, según las reglas específicas del recurso:

```text
Pet
Public Profile
Emergency Profile
Guardians
Pet identifiers
Pet-related settings
Pet timeline
Pet events autorizados
```

Sin embargo:

```text
OWNER ≠ acceso automático a sistemas internos de PAWFINDs
```

---

# 13. Co-Owner

`CO_OWNER` permite compartir responsabilidades sobre una mascota.

Debe evitarse asumir que:

```text
CO_OWNER = OWNER
```

Algunas operaciones sensibles podrán requerir:

```text
OWNER
```

o:

```text
OWNER + Trusted Backend
```

según la política futura.

---

# 14. Caregiver

`CAREGIVER` representa una persona autorizada para cuidar una mascota.

Puede tener acceso limitado a:

* información necesaria para el cuidado;
* información pública;
* información de emergencia autorizada;
* determinadas actualizaciones operativas.

No debe recibir automáticamente:

* propiedad legal;
* control de guardianes;
* información médica completa;
* credenciales;
* dispositivos;
* datos privados no necesarios.

---

# 15. Veterinarian

`VETERINARIAN` representa una relación profesional con una mascota.

El acceso deberá estar limitado a información médica autorizada.

Conceptualmente:

```text
VETERINARIAN
    ↓
MEDICAL SCOPE
    ↓
AUTHORIZED PET
```

No implica:

```text
OWNER
```

ni:

```text
ADMIN
```

ni:

```text
FULL PET ACCESS
```

---

# 16. Moderator

El moderador podrá trabajar sobre contenido que requiera revisión.

Ejemplo:

```text
alert.approve
alert.reject
alert.moderate
```

Su acceso debe estar limitado por:

```text
permission
+
scope
```

Ejemplo:

```text
MODERATOR
permission = alert.approve
scope = CITY
scopeId = Medellín
```

No debe poder modificar arbitrariamente:

```text
pet.owner
medical.records
user.credentials
membership
audit.logs
```

salvo que exista una capacidad administrativa explícita y justificada.

---

# 17. Organization Member

Un `ORG MEMBER` pertenece a una organización.

Puede:

* consultar recursos permitidos;
* crear contenido autorizado;
* participar en actividades;
* ejecutar operaciones dentro de su scope.

No puede administrar automáticamente toda la organización.

---

# 18. Organization Manager

`ORG MANAGER` puede administrar recursos operativos de una organización según los permisos concedidos.

Ejemplos:

```text
organization.resource.manage
organization.member.manage
organization.content.manage
```

Pero:

```text
ORG MANAGER ≠ PLATFORM ADMIN
```

---

# 19. Organization Admin

`ORG ADMIN` tiene capacidades administrativas superiores dentro de su organización.

Su autoridad debe permanecer limitada al:

```text
ORGANIZATION SCOPE
```

No debe convertirse automáticamente en administrador global.

---

# 20. Admin

`ADMIN` representa una capacidad administrativa de plataforma.

Debe utilizarse con precaución.

El sistema deberá evitar reglas como:

```text
if role == ADMIN:
    allow everything
```

En su lugar:

```text
ADMIN
+
PERMISSION
+
SCOPE
+
AUDIT
```

Las operaciones altamente sensibles podrán requerir Trusted Backend.

---

# 21. Resource-Level Matrix

## Users

| Acción  | Público |                 Usuario |            Admin |
| ------- | ------: | ----------------------: | ---------------: |
| CREATE  |      🔴 | 🟢 propio mediante Auth |               🟡 |
| READ    |      🔴 |               🟢 propio | 🟢 según permiso |
| UPDATE  |      🔴 |             🟢 limitado | 🟢 según permiso |
| DELETE  |      🔴 |                   🔴/🟡 |               🟡 |
| APPROVE |      🔴 |                      🔴 |               🟡 |
| MANAGE  |      🔴 |                      🔴 |               🟢 |

---

## Pets

| Acción  |             Público | Usuario autorizado | Owner |            Admin |
| ------- | ------------------: | -----------------: | ----: | ---------------: |
| CREATE  |                  🔴 |                 🟢 |    🟢 |               🟢 |
| READ    | 🟢 público limitado |                 🟢 |    🟢 |               🟢 |
| UPDATE  |                  🔴 |                 🟡 |    🟢 | 🟢 según permiso |
| DELETE  |                  🔴 |                 🔴 |    🟡 |               🟡 |
| APPROVE |                  🔴 |                 🔴 |    🔴 |               🟡 |
| MANAGE  |                  🔴 |                 🟡 |    🟢 |               🟢 |

---

# 22. Public Profile

El perfil público debe poder consultarse sin autenticación cuando:

```text
visibility == PUBLIC
```

La visibilidad no debe utilizarse para exponer información privada almacenada en otros documentos.

Modelo:

```text
PUBLIC PROFILE
        ↓
safe public data
```

No:

```text
PRIVATE PET DOCUMENT
        ↓
filter fields
        ↓
PUBLIC
```

---

# 23. Emergency Profile

El perfil de emergencia requiere una política diferente.

Aunque exista:

```text
enabled == true
```

eso no significa que cualquier persona pueda consultar automáticamente todos los datos.

El acceso futuro deberá considerar:

```text
emergency context
+
credential/resolver
+
policy
+
scope
+
audit
```

Las decisiones definitivas del resolver QR/NFC quedan fuera de v0.4.

---

# 24. Guardians

Los guardianes deben gestionarse como relaciones independientes.

Ejemplo:

```text
OWNER
    ↓
pet_guardian
    ↓
PET
```

El usuario no debe obtener permisos únicamente por conocer el `petId`.

Debe existir una relación válida:

```text
userId
+
petId
+
role
+
status
```

---

# 25. Organizations

Las capacidades organizacionales deberán derivarse de:

```text
membership
+
role
+
permission
+
scope
+
status
```

Una membresía:

```text
status = REVOKED
```

no debe seguir otorgando capacidades.

Una membresía:

```text
status = EXPIRED
```

tampoco.

---

# 26. Status como requisito de autorización

El estado del recurso debe formar parte de la decisión.

Ejemplo:

```text
guardian.status == ACTIVE
```

puede permitir una operación.

Pero:

```text
guardian.status == REVOKED
```

debe impedirla.

Lo mismo aplica conceptualmente a:

```text
users.status
memberships.status
organizations.status
pet_ids.status
```

---

# 27. Custom Claims

Custom Claims podrán utilizarse para información pequeña y estable relacionada con autorización de plataforma.

Ejemplos potenciales:

```text
platformRole
moderator
admin
```

No deberán utilizarse como almacenamiento principal de:

```text
memberships
pets
guardians
large permission arrays
organization lists
dynamic relationships
```

Las relaciones dinámicas permanecerán en Firestore.

---

# 28. Trusted Backend

Determinadas operaciones deberán ejecutarse mediante un entorno confiable.

Ejemplos futuros:

```text
change ownership
revoke credential
critical guardian changes
sensitive administrative operations
audit event creation
emergency resolver
security-sensitive workflows
```

Principio:

```text
Frontend
    ↓
request
    ↓
Trusted Backend
    ↓
authorization
    ↓
Firestore
```

El cliente no deberá poder falsificar operaciones críticas.

---

# 29. Audit

Las siguientes operaciones deberán considerarse candidatas para auditoría:

```text
guardian changes
membership changes
role changes
permission changes
moderation
administrative actions
credential changes
sensitive emergency access
security-sensitive operations
```

Los eventos de auditoría no deberán depender exclusivamente de escrituras realizadas por el frontend.

---

# 30. Prohibiciones arquitectónicas

PAWFINDs no deberá implementar autorización basándose únicamente en:

```text
hidden buttons
frontend variables
localStorage
sessionStorage
email comparison
hardcoded admin email
PIN stored in JavaScript
document ID knowledge
client-side role flags
```

Estos mecanismos pueden servir para UX o prototipos, pero no constituyen seguridad.

---

# 31. Principio de mínimo privilegio

Cada rol deberá recibir solamente los permisos necesarios.

Modelo:

```text
DEFAULT = DENY
```

y posteriormente:

```text
EXPLICIT ALLOW
```

No:

```text
DEFAULT = ALLOW
```

---

# 32. Principio de separación de funciones

Las capacidades deberán permanecer separadas.

Ejemplo:

```text
OWNER
≠
MODERATOR
≠
VETERINARIAN
≠
ORG ADMIN
≠
PLATFORM ADMIN
```

Un mismo usuario puede acumular varias relaciones, pero cada una deberá conservar su propio contexto.

---

# 33. Decisiones v0.4

### 🟢 Aprobado

* RBAC + ReBAC.
* Platform Roles separados de Organization Roles.
* Pet Relationship Roles separados de Platform Roles.
* Permissions explícitos.
* Scopes explícitos.
* Default Deny.
* Mínimo privilegio.
* Memberships como fuente de relación organizacional.
* Guardians como fuente de relación con mascotas.
* Custom Claims limitados.
* Frontend no es frontera de seguridad.
* App Check no sustituye autorización.
* Operaciones críticas mediante Trusted Backend.
* Auditoría para operaciones sensibles.

### 🟡 Observación

* Nombres definitivos de algunos permisos.
* Granularidad exacta de scopes.
* Permisos exactos de cada recurso.
* Política completa para Emergency Profile.
* Operaciones que requerirán obligatoriamente Trusted Backend.
* Política de acceso de administradores a información sensible.

### 🔵 Decisión pendiente

* Caso exacto de `CASE`.
* Modelo definitivo de `ALERT` respecto a `CASE`.
* Resolver QR/NFC.
* Políticas completas de emergencia.
* Sistema completo de delegación de permisos.
* Event/Rule/Action Engine.
* Políticas avanzadas de auditoría.

---

# 34. Criterio para Firestore Rules

Antes de escribir las reglas definitivas deberá poder expresarse una autorización como:

```text
ALLOW
IF
authenticated
AND
user is active
AND
relationship is valid
AND
permission exists
AND
scope matches
AND
resource state allows operation
```

Las reglas deberán implementar el modelo aprobado.

No deberán inventar lógica de negocio nueva que no esté documentada.

---

# 35. Próximo paso

Una vez aprobado este modelo, el siguiente documento técnico será:

```text
PAWFINDs — Firestore Security Rules Design v0.4
```

Ese documento traducirá:

```text
Roles
+
Relationships
+
Permissions
+
Scopes
+
Resource States
```

a una estructura concreta de autorización para Firebase.

Todavía no se implementarán las reglas definitivas hasta completar ese diseño.

---

# 36. Estado

```text
Permission Model:        🟢 Initial Design
Role Model:              🟢 Initial Design
RBAC:                    🟢 Defined
ReBAC:                   🟢 Defined
Permissions:             🟡 Initial
Scopes:                  🟡 Initial
Custom Claims:           🟢 Defined
Trusted Backend:         🟢 Defined
Audit:                   🟢 Defined
Firestore Rules:         🔵 Pending
Implementation:          🔵 Pending
```

**Regla de oro:**

> Primero definimos quién puede hacer qué, sobre qué recurso y bajo qué alcance. Después escribimos las reglas. Nunca al revés.
# PAWFINDs — Firestore Security Rules Design v0.4

## 1. Propósito

Este documento define el diseño de autorización que deberá implementarse posteriormente mediante Firebase Firestore Security Rules.

Su función es traducir:

```text
Identity
+
Roles
+
Relationships
+
Permissions
+
Scopes
+
Resource States
```

en reglas verificables de acceso.

Este documento **no constituye todavía la implementación final de `firestore.rules`**.

La implementación deberá realizarse únicamente después de revisar y aprobar este diseño.

---

# 2. Principio de seguridad

PAWFINDs utilizará:

```text
DEFAULT DENY
```

como principio general.

La ausencia de una regla explícita de autorización deberá significar:

```text
DENY
```

El frontend nunca será considerado una frontera de seguridad.

Ocultar un botón, modificar JavaScript o cambiar una variable local no deberá otorgar permisos.

---

# 3. Flujo conceptual de autorización

Toda operación deberá evaluarse conceptualmente así:

```text
REQUEST
   ↓
¿Está autenticado?
   ↓
¿El usuario está activo?
   ↓
¿La operación corresponde al recurso?
   ↓
¿Existe una relación válida?
   ↓
¿Existe el permiso necesario?
   ↓
¿El scope permite la operación?
   ↓
¿El estado del recurso permite la operación?
   ↓
ALLOW / DENY
```

No todas las colecciones necesitarán todas las comprobaciones.

---

# 4. Authentication

## 4.1 Usuario no autenticado

El usuario no autenticado podrá acceder únicamente a información explícitamente pública.

Ejemplos:

```text
pet_public_profiles
public alerts
public organization information
```

No podrá acceder directamente a:

```text
users private data
pets private data
medical data
guardians
memberships
audit logs
permissions
internal moderation data
```

---

# 5. User State

El documento:

```text
users/{uid}
```

deberá contener un estado controlado.

Estados:

```text
ACTIVE
SUSPENDED
DISABLED
```

Como principio general:

```text
ACTIVE
    → puede utilizar las capacidades permitidas.

SUSPENDED
    → acceso restringido.

DISABLED
    → acceso bloqueado.
```

La comprobación de estado deberá evitar que una cuenta suspendida continúe ejecutando operaciones protegidas.

---

# 6. Protección del UID

El `uid` de Firebase Authentication será la identidad primaria del usuario.

No deberá poder ser cambiado por el cliente.

Conceptualmente:

```text
request.auth.uid
    ==
users/{uid}.uid
```

En una actualización:

```text
uid
createdAt
```

deberán permanecer protegidos.

---

# 7. `users/{uid}`

## CREATE

La creación del documento deberá corresponder al usuario autenticado que representa:

```text
request.auth.uid == uid
```

El cliente no deberá poder establecer arbitrariamente:

```text
platformRole
isAdmin
permissions
security flags
```

si estos campos fueran utilizados posteriormente.

---

## READ

Un usuario podrá consultar su propia información permitida.

El acceso público a información de usuario deberá mantenerse limitado.

---

## UPDATE

Un usuario podrá actualizar únicamente campos de perfil permitidos.

Ejemplos potenciales:

```text
displayName
photoURL
```

No deberá poder modificar directamente:

```text
uid
createdAt
platformRole
security state
administrative permissions
```

---

## DELETE

La eliminación física del usuario no será una operación normal del cliente en v0.4.

Cuando sea necesario desactivar una cuenta se preferirá:

```text
status = DISABLED
```

o un proceso controlado mediante backend.

---

# 8. `pets/{petId}`

La colección `pets` representa la identidad interna de una mascota.

El acceso deberá depender de una relación válida con la mascota.

La propiedad no deberá inferirse únicamente de:

```text
createdBy
```

La relación principal deberá provenir de:

```text
pet_guardians
```

---

# 9. Creación de Pet

La creación deberá requerir:

```text
authenticated user
+
ACTIVE user
```

El sistema deberá registrar quién creó inicialmente la mascota.

Conceptualmente:

```text
createdBy == request.auth.uid
```

La creación deberá establecer una relación inicial de guardianía apropiada mediante un flujo controlado.

No se deberá permitir que un usuario cree arbitrariamente una mascota indicando que otra persona es `OWNER`.

---

# 10. Actualización de Pet

La actualización deberá depender de la relación del usuario con la mascota.

Ejemplo:

```text
OWNER
CO_OWNER
```

podrán recibir capacidades de actualización según el recurso.

Un:

```text
CAREGIVER
```

no deberá recibir automáticamente las mismas capacidades.

---

# 11. Campos protegidos de Pet

Los campos de identidad estructural no deberán poder modificarse arbitrariamente.

Ejemplos:

```text
petId
createdAt
createdBy
```

La modificación de relaciones sensibles deberá realizarse mediante una política específica.

---

# 12. Public Profile

Colección:

```text
pet_public_profiles/{petId}
```

Su función es separar la información pública de la información privada.

La lectura pública podrá permitirse únicamente cuando:

```text
visibility == PUBLIC
```

La información almacenada aquí deberá ser considerada apta para exposición pública.

---

# 13. Actualización del Public Profile

Podrán modificarlo usuarios con una relación autorizada con la mascota.

Por ejemplo:

```text
OWNER
CO_OWNER
```

según la política definida.

La operación deberá impedir que el usuario utilice el perfil público para introducir información que pertenece a:

```text
private
medical
guardian
security
credential
device
```

---

# 14. Emergency Profile

Colección:

```text
pet_emergency_profiles/{petId}
```

Esta colección contiene información potencialmente sensible.

Por lo tanto:

```text
visibility
```

no deberá interpretarse como autorización universal.

La lectura deberá depender de una política de emergencia.

En v0.4 se permitirá la preparación estructural del modelo, pero el resolver completo:

```text
QR
NFC
credential
device
emergency context
```

queda fuera de implementación.

---

# 15. Emergency Profile — modificación

Las modificaciones deberán limitarse a relaciones autorizadas.

Inicialmente:

```text
OWNER
CO_OWNER
```

podrán gestionar la información correspondiente.

Un:

```text
VETERINARIAN
```

no deberá poder modificar libremente todo el perfil de emergencia salvo que exista un permiso específico.

---

# 16. `pet_guardians/{guardianId}`

Esta colección representa relaciones críticas.

Por ello no deberá permitirse que cualquier usuario cree una relación:

```text
userId = X
petId = Y
role = OWNER
```

sobre una mascota ajena.

La creación, modificación, revocación y transferencia de relaciones sensibles deberá tener controles específicos.

---

# 17. Protección contra escalamiento de privilegios

Debe impedirse cualquier operación como:

```text
CAREGIVER
→ OWNER
```

realizada directamente por el propio usuario.

También:

```text
USER
→ ADMIN
```

```text
MEMBER
→ ORG ADMIN
```

```text
PUBLIC
→ OWNER
```

La modificación de roles sensibles deberá requerir una autoridad existente y válida.

---

# 18. Owner y Co-Owner

Las operaciones normales podrán comprobar una relación activa:

```text
pet_guardians
```

con:

```text
role == OWNER
```

o:

```text
role == CO_OWNER
```

y:

```text
status == ACTIVE
```

Una relación:

```text
REVOKED
EXPIRED
INACTIVE
```

no deberá conceder autorización.

---

# 19. Caregiver

El acceso de `CAREGIVER` deberá ser explícito.

No deberá heredarse automáticamente todo el acceso del propietario.

Ejemplo:

```text
CAREGIVER
→ READ permitted information
→ UPDATE permitted care information
→ NO ownership management
→ NO guardian management
```

La granularidad definitiva de permisos podrá ampliarse posteriormente.

---

# 20. Veterinarian

El acceso de `VETERINARIAN` deberá estar limitado al contexto autorizado.

Conceptualmente:

```text
VETERINARIAN
+
PET RELATIONSHIP
+
MEDICAL PERMISSION
```

No deberá implicar acceso automático a:

```text
financial information
private guardian data
ownership controls
administrative platform data
```

---

# 21. `pet_ids/{pawfindsPetId}`

Este documento representa el identificador público persistente de PAWFINDs.

La relación conceptual es:

```text
pawfindsPetId
      ↓
petId
```

El usuario no deberá poder utilizar este documento para apropiarse de una mascota.

No deberá permitirse:

```text
update petId
```

desde un cliente normal.

---

# 22. Identidad vs Credential

Las futuras credenciales:

```text
QR
NFC
microchip
```

no deberán convertirse en una fuente de autorización por sí mismas.

El modelo deberá distinguir:

```text
credential
identity
authorization
```

Un identificador encontrado no demuestra automáticamente propiedad.

---

# 23. Organizations

Colección:

```text
organizations/{orgId}
```

La organización tendrá su propio estado:

```text
ACTIVE
SUSPENDED
DISABLED
```

Una organización suspendida no deberá continuar ejecutando operaciones organizacionales normales.

---

# 24. Memberships

Colección:

```text
memberships/{membershipId}
```

La autorización deberá comprobar:

```text
userId
organizationId
role
status
permissions
scope
```

Una membresía:

```text
PENDING
```

no deberá tener automáticamente las capacidades de una:

```text
ACTIVE
```

Una membresía:

```text
REVOKED
EXPIRED
SUSPENDED
```

no deberá otorgar acceso operativo.

---

# 25. Organization Scope

Las operaciones organizacionales deberán quedar limitadas a la organización correspondiente.

Ejemplo:

```text
ORG ADMIN
Organization A
```

no deberá poder modificar:

```text
Organization B
```

simplemente por tener un rol administrativo.

---

# 26. Organization Role Escalation

Un miembro no deberá poder modificar su propio documento para convertirse en:

```text
MANAGER
```

o:

```text
ADMIN
```

La modificación de roles deberá requerir una autoridad organizacional válida.

---

# 27. Events

Colección:

```text
events/{eventId}
```

Los eventos importantes deberán protegerse contra manipulación.

El cliente no deberá poder falsificar libremente eventos de seguridad.

Ejemplo problemático:

```text
actorId = admin
eventType = ROLE_GRANTED
```

si realmente el usuario no era administrador.

---

# 28. Event Creation

Algunos eventos podrán ser creados por usuarios cuando correspondan a acciones normales.

Otros deberán generarse mediante Trusted Backend.

Especialmente:

```text
security events
role changes
permission changes
critical administrative actions
credential changes
sensitive access
```

---

# 29. Event Updates

Los eventos críticos deberán tratarse como registros inmutables o prácticamente inmutables.

No deberá permitirse que un usuario:

```text
create event
↓
change actor
↓
change timestamp
↓
change eventType
```

para ocultar una operación.

---

# 30. Audit Logs

Los audit logs no deberán depender de:

```text
frontend-only writes
```

Una implementación futura deberá utilizar mecanismos confiables para registrar operaciones sensibles.

El cliente no deberá poder borrar arbitrariamente registros de auditoría.

---

# 31. Alerts — compatibilidad

La colección existente:

```text
alerts/{alertId}
```

continuará funcionando durante la transición.

Las Rules actuales son temporales y deberán considerarse:

```text
PROTOTYPE SECURITY
```

no:

```text
PRODUCTION SECURITY
```

---

# 32. Current Alerts Create

La regla actual exige:

```text
request.auth != null
```

y:

```text
request.resource.data.userId == request.auth.uid
```

y:

```text
status == pending
```

Este comportamiento se conservará durante la transición mientras se diseña el nuevo modelo.

---

# 33. Current Alerts Moderation

La implementación actual permite que un usuario autenticado cambie:

```text
pending
→
approved
```

o:

```text
pending
→
rejected
```

Esta capacidad es temporal y deberá ser reemplazada.

En el modelo final:

```text
alert.approve
```

deberá depender de:

```text
MODERATOR
ADMIN
```

o una autoridad organizacional específicamente autorizada.

---

# 34. Alert Field Protection

La moderación deberá evitar que una operación destinada a aprobar una alerta pueda modificar simultáneamente otros campos.

Conceptualmente:

```text
approval operation
→ status only
```

Las operaciones administrativas y de contenido deberán mantenerse separadas.

---

# 35. Delete Strategy

Para recursos importantes se preferirá:

```text
soft state transition
```

en lugar de eliminación física.

Ejemplos:

```text
ACTIVE
→ DISABLED

ACTIVE
→ REVOKED

ACTIVE
→ ARCHIVED
```

La eliminación física deberá reservarse para casos explícitos y controlados.

---

# 36. Default Deny

El archivo final deberá terminar conceptualmente con una política equivalente a:

```text
allow read, write: if false;
```

para cualquier ruta no definida explícitamente.

La intención es evitar que una nueva colección quede accidentalmente abierta.

---

# 37. No Wildcard Permissions

No deberá utilizarse una lógica equivalente a:

```text
if user is authenticated:
    allow everything
```

ni:

```text
if user has any role:
    allow everything
```

La autorización deberá ser específica.

---

# 38. Protección contra campos adicionales

Las Rules deberán considerar la posibilidad de que un cliente envíe campos que la interfaz nunca muestra.

Ejemplo:

```text
{
  displayName: "Usuario",
  platformRole: "ADMIN"
}
```

El hecho de que el frontend no tenga un campo `platformRole` no significa que el atacante no pueda enviarlo manualmente.

Por ello, los campos sensibles deberán validarse en Rules o gestionarse exclusivamente mediante Trusted Backend.

---

# 39. Field-Level Security

Firestore Rules permiten validar campos mediante:

```text
request.resource.data
```

y:

```text
resource.data
```

Por ello, las actualizaciones deberán comprobar qué campos cambiaron cuando sea necesario.

Conceptualmente:

```text
affectedKeys()
```

deberá utilizarse para impedir modificaciones no autorizadas.

---

# 40. Immutable Fields

Los siguientes campos deberán considerarse candidatos a protección contra modificación:

```text
uid
petId
pawfindsPetId
createdAt
createdBy
organizationId
userId
critical identifiers
```

Cada colección deberá definir explícitamente cuáles son inmutables.

---

# 41. Timestamps

Los timestamps importantes deberán generarse mediante:

```text
serverTimestamp()
```

desde el cliente o Trusted Backend, según el contexto.

Las Rules deberán evitar que un usuario pueda falsificar libremente:

```text
createdAt
```

cuando este campo sea crítico para integridad o auditoría.

---

# 42. Data Integrity

Las Rules deberán validar relaciones cuando sea viable.

Ejemplo conceptual:

```text
guardian.petId
```

deberá corresponder a una mascota existente.

Sin embargo, no se deberá convertir Firestore Rules en un sistema completo de lógica de negocio.

Las operaciones complejas deberán migrar a Trusted Backend.

---

# 43. Firestore Rules vs Business Logic

Firestore Rules deben encargarse principalmente de:

```text
AUTHORIZATION
+
DATA INTEGRITY
+
ACCESS CONTROL
```

No deben encargarse de toda la lógica de negocio.

Ejemplos de lógica que probablemente deberán ejecutarse en backend:

```text
ownership transfer
complex guardian workflows
emergency resolver
credential assignment
multi-document transactions
complex moderation workflows
notifications
audit generation
future Event → Rule → Action
```

---

# 44. App Check

App Check podrá utilizarse como mecanismo adicional de protección contra abuso.

Pero:

```text
App Check ≠ Authorization
```

No deberá utilizarse como sustituto de:

```text
Authentication
Firestore Rules
Trusted Backend
```

---

# 45. Client Trust Model

El cliente deberá considerarse:

```text
UNTRUSTED
```

Incluso si es la aplicación oficial de PAWFINDs.

Un atacante puede modificar:

```text
JavaScript
requests
payloads
local state
network calls
```

Por ello, toda autorización importante deberá verificarse en el servidor.

---

# 46. Migration Strategy

La migración desde las Rules temporales deberá realizarse por etapas.

## Fase 1

Mantener:

```text
alerts
```

funcionando.

## Fase 2

Crear y probar:

```text
users
pets
pet_public_profiles
pet_emergency_profiles
pet_guardians
pet_ids
organizations
memberships
events
```

en entorno controlado.

## Fase 3

Implementar nuevas Rules.

## Fase 4

Ejecutar pruebas de:

```text
ALLOW
DENY
PRIVILEGE ESCALATION
FIELD TAMPERING
CROSS-USER ACCESS
CROSS-ORGANIZATION ACCESS
```

## Fase 5

Solo después de superar las pruebas:

```text
reemplazar Rules temporales
```

---

# 47. Security Test Matrix

Cada colección deberá probar como mínimo:

```text
Anonymous
Authenticated user
Owner
Co-owner
Caregiver
Veterinarian
Moderator
Organization member
Organization manager
Organization admin
Platform admin
Suspended user
Revoked relationship
Expired membership
Unauthorized user
```

Y cada caso deberá probar:

```text
CREATE
READ
UPDATE
DELETE
APPROVE
MANAGE
```

cuando corresponda.

---

# 48. Privilege Escalation Tests

Deberán probarse intentos como:

```text
USER → ADMIN
USER → OWNER
CAREGIVER → OWNER
ORG MEMBER → ORG ADMIN
ORG MANAGER → PLATFORM ADMIN
```

mediante manipulación directa de documentos.

Todos deberán resultar:

```text
DENIED
```

salvo mediante el flujo autorizado correspondiente.

---

# 49. Cross-Resource Tests

También deberán probarse:

```text
User A → Pet B
Organization A → Organization B
Moderator City A → City B
Veterinarian Pet A → Pet B
Caregiver Pet A → Pet B
```

cuando no exista una relación o scope válido.

Resultado esperado:

```text
DENIED
```

---

# 50. Security Acceptance Criteria

El diseño será considerado listo para implementación cuando:

* no exista una colección crítica sin política definida;
* los roles estén separados de las relaciones;
* los permisos sean explícitos;
* los scopes estén definidos;
* los campos sensibles estén protegidos;
* exista una estrategia contra privilege escalation;
* exista una estrategia de auditoría;
* las operaciones críticas estén identificadas;
* las operaciones backend estén identificadas;
* las Rules temporales de `alerts` tengan una ruta de migración;
* exista una matriz de pruebas.

---

# 51. Estado

```text
Authentication Model       🟢
Default Deny              🟢
User Rules Design         🟢
Pet Rules Design          🟢
Public Profile            🟢
Emergency Profile         🟡
Guardians                 🟢
Pet IDs                   🟢
Organizations             🟢
Memberships               🟢
Events                    🟡
Audit                     🟡
Alerts Compatibility      🟢
Privilege Escalation       🟢
Field Protection           🟢
Trusted Backend            🟢
Migration                  🟢
Implementation             🔵
```

---

# 52. Regla de oro

> **Las Firestore Rules no deben intentar adivinar quién debería tener acceso. Deben verificar una autorización que ya está definida por identidad, relación, permiso, scope y estado.**

La seguridad de PAWFINDs deberá diseñarse para que un usuario pueda manipular el frontend, modificar solicitudes y conocer IDs sin poder convertir esas acciones en privilegios no autorizados.
# 53. Exact Data Schemas

La definición exacta de los schemas de datos no pertenece a este documento como fuente primaria.

La fuente de verdad para los schemas de Firestore es:

```text
PAWFINDs — Firestore Schema & Data Model v0.4
```

Documento:

```text
C:\Users\EDCOL\OneDrive\Documentos\PawFinds\docs\architecture\technical-design-v0.4.md
```

El presente documento utiliza esos schemas como base para definir autorización.

Las colecciones contempladas actualmente son:

```text
users/{uid}
pets/{petId}
pet_public_profiles/{petId}
pet_emergency_profiles/{petId}
pet_guardians/{guardianId}
pet_ids/{pawfindsPetId}
organizations/{orgId}
memberships/{membershipId}
events/{eventId}
alerts/{alertId}
```

Las siguientes entidades permanecen fuera de implementación funcional en v0.4:

```text
credentials
devices
cases
travel
```

Por lo tanto:

```text
DATA SCHEMA
    ↓
Firestore Schema & Data Model v0.4

SECURITY MODEL
    ↓
Firestore Security Rules Design v0.4
```

No deberán crearse campos, colecciones o relaciones nuevas únicamente dentro de las Security Rules sin actualizar previamente el Data Model.

---

# 54. Current Rules vs Planned Rules

Para evitar confusión durante la migración, PAWFINDs mantendrá una separación explícita entre las reglas actualmente desplegadas y las reglas diseñadas para v0.4.

## 54.1 CURRENT RULES — Actualmente desplegadas

La colección actualmente funcional y protegida mediante reglas temporales es:

```text
alerts/{alertId}
```

Las reglas actuales permiten:

### READ

```text
PUBLIC
→ READ
```

### CREATE

```text
AUTHENTICATED USER
+
request.resource.data.userId == request.auth.uid
+
status == "pending"
```

### UPDATE

Actualmente se permite la transición:

```text
pending
→ approved

pending
→ rejected
```

y la actualización queda limitada al campo:

```text
status
```

### DELETE

```text
DENY
```

Estas reglas fueron creadas para validar el prototipo de moderación y no representan todavía el modelo de seguridad definitivo de PAWFINDs.

---

# 55. PLANNED RULES — v0.4

Las reglas planificadas serán diseñadas alrededor de:

```text
Firebase Authentication
+
User State
+
Platform Role
+
Pet Relationship
+
Organization Membership
+
Permission
+
Scope
+
Resource State
```

La autorización futura deberá cubrir las siguientes colecciones:

```text
users
pets
pet_public_profiles
pet_emergency_profiles
pet_guardians
pet_ids
organizations
memberships
events
alerts
```

La implementación definitiva todavía está pendiente.

---

# 56. No mezclar CURRENT y PLANNED

Durante la transición:

```text
CURRENT RULES
```

significa:

> reglas realmente desplegadas y funcionando en Firebase.

Mientras que:

```text
PLANNED RULES
```

significa:

> diseño aprobado o pendiente de implementación para la arquitectura v0.4.

Nunca deberá asumirse que una regla descrita en este documento ya está activa en producción.

---

# 57. Migration Boundary

La frontera entre ambos modelos será:

```text
CURRENT
alerts
   ↓
MIGRATION
   ↓
v0.4 SECURITY MODEL
   ↓
PLANNED RULES
```

No deberá realizarse un reemplazo directo de las Rules actuales sin ejecutar previamente las pruebas de seguridad.

---

# 58. Implementation Status

```text
CURRENT RULES
alerts
    🟢 deployed and tested

PLANNED RULES
users
    🔵 not implemented

pets
    🔵 not implemented

pet_public_profiles
    🔵 not implemented

pet_emergency_profiles
    🔵 not implemented

pet_guardians
    🔵 not implemented

pet_ids
    🔵 not implemented

organizations
    🔵 not implemented

memberships
    🔵 not implemented

events
    🔵 not implemented

alerts v0.4 authorization
    🔵 planned migration
```

---

# 59. Final Security Design Boundary

Antes de implementar cualquier regla nueva deberá cumplirse:

```text
EXACT DATA SCHEMA
        ↓
ROLE MODEL
        ↓
PERMISSION MODEL
        ↓
SECURITY RULES DESIGN
        ↓
SECURITY TESTS
        ↓
IMPLEMENTATION
```

No se deberá modificar el schema directamente desde las Rules.

No se deberá utilizar la implementación actual de `alerts` como modelo definitivo para todas las colecciones.

No se deberá asumir que las reglas planificadas ya protegen los datos que todavía no han sido implementados.

---

# 60. Estado actualizado

```text
Exact Data Schemas
    🟢 Defined in Firestore Schema & Data Model v0.4

Current Rules
    🟢 Explicitly documented

Planned Rules
    🟢 Explicitly separated

Migration Boundary
    🟢 Defined

Final Firestore Rules
    🔵 Pending implementation
```
# 61. Architecture & Security Cross-Audit v0.4

## 61.1 Objetivo

Esta auditoría verifica la coherencia entre:

```text
Vision & Master Blueprint v1.4
Technical Design v0.4
Firestore Schema & Data Model v0.4
Permission Matrix & Role Model v0.4
Firestore Security Rules Design v0.4
Current Prototype Implementation
```

El objetivo es detectar contradicciones, riesgos, campos faltantes, permisos excesivos y diferencias entre la arquitectura planificada y el sistema actualmente desplegado.

---

# 62. Resultado general

```text
Arquitectura conceptual        🟢 COHERENTE
Modelo de datos                🟢 COHERENTE
Modelo de roles                🟢 COHERENTE
Modelo de permisos             🟢 COHERENTE
Separación Current/Planned     🟢 COHERENTE
Seguridad futura               🟢 BIEN DEFINIDA
Implementación actual          🟡 PROTOTIPO
Rules actuales                 🟡 TEMPORALES
Migración                      🟢 PLANIFICADA
```

No se detecta una contradicción arquitectónica que obligue a rediseñar el Blueprint v1.4.

Por lo tanto:

> **No se requiere otra ronda conceptual de arquitectura antes de comenzar v0.4.**

---

# 63. 🟢 Hallazgos aprobados

## 63.1 User / Organization / Membership

La separación:

```text
USER
ORGANIZATION
MEMBERSHIP
```

es consistente.

Un usuario puede pertenecer a diferentes organizaciones con diferentes roles.

No debe utilizarse un único rol global para representar todas las relaciones.

---

## 63.2 Pet Identity

La separación:

```text
petId
pawfindsPetId
credentialId
deviceId
```

es correcta.

La identidad interna continúa siendo:

```text
petId
```

Los identificadores externos no deben convertirse en la identidad primaria.

---

## 63.3 Guardians

La relación:

```text
pet_guardians/{guardianId}
```

es coherente con el modelo ReBAC.

Esto permite que una mascota tenga múltiples personas y organizaciones relacionadas sin almacenar una lista rígida dentro de `pets`.

---

## 63.4 Public / Emergency / Private / Medical

La separación de información es adecuada.

No deberá intentarse proteger información sensible simplemente filtrando campos de un documento público.

La separación física de documentos continúa siendo la estrategia correcta.

---

## 63.5 RBAC + ReBAC

El modelo:

```text
RBAC
+
ReBAC
+
Permission
+
Scope
```

es consistente con el crecimiento previsto de PAWFINDs.

---

## 63.6 Custom Claims

La decisión de no utilizar Custom Claims como base de:

```text
memberships
pets
guardians
large permission arrays
```

es correcta.

Las relaciones dinámicas deberán permanecer en Firestore.

---

# 64. 🟡 Observación 1 — Permissions dentro de relaciones

Los schemas permiten:

```text
pet_guardians.permissions
memberships.permissions
```

Esto es útil para delegación granular, pero crea un riesgo importante.

Un usuario no puede tener capacidad para modificar sus propios permisos.

Ejemplo que debe ser imposible:

```text
USER
↓
pet_guardian
↓
permissions = ["pet.manage"]
```

si el propio usuario puede escribir ese documento.

Por lo tanto:

```text
permissions
role
status
scopeType
scopeId
```

deberán considerarse campos protegidos.

Su modificación deberá requerir una autoridad existente o Trusted Backend.

### Estado

```text
🟡 Diseñado correctamente
🟢 Debe quedar protegido durante implementación
```

---

# 65. 🟡 Observación 2 — Creación de Pet + Owner

Actualmente el diseño permite:

```text
CREATE PET
```

y posteriormente:

```text
CREATE GUARDIAN
```

Pero estas operaciones están relacionadas.

Debe evitarse una situación donde exista:

```text
pets/PET123
```

sin un responsable válido.

También debe evitarse que un usuario cree:

```text
PET123
OWNER = USER_B
```

sin autorización.

La implementación deberá definir una estrategia coherente para la creación inicial.

Opciones futuras:

```text
Cliente
→ crear Pet
→ crear relación OWNER
```

con reglas suficientemente estrictas,

o:

```text
Cliente
→ Trusted Backend
→ crear Pet + OWNER
```

para una operación transaccional.

### Estado

```text
🟡 Decisión técnica de implementación pendiente
```

No requiere modificar el Blueprint.

---

# 66. 🟡 Observación 3 — Emergency Profile

El schema contiene:

```text
enabled
visibility
allowedContexts
```

pero la autorización real de emergencia todavía depende del futuro resolver.

Por lo tanto:

```text
Emergency Profile
```

puede existir estructuralmente en v0.4, pero no debe interpretarse como:

```text
enabled == true
→ cualquier persona puede leerlo
```

La política completa dependerá posteriormente de:

```text
credential
resolver
context
policy
audit
```

### Estado

```text
🟡 Estructura aprobada
🔵 Acceso público/emergencia completo pendiente
```

---

# 67. 🟡 Observación 4 — Events

La colección:

```text
events/{eventId}
```

es adecuada como fundamento.

Sin embargo, el cliente no deberá poder falsificar eventos sensibles.

Ejemplo:

```text
eventType = ROLE_GRANTED
actorId = ADMIN
```

no puede ser aceptado únicamente porque esos valores aparezcan en el payload enviado por el navegador.

Los eventos administrativos y de seguridad deberán generarse o validarse mediante mecanismos confiables.

### Estado

```text
🟢 Schema aprobado
🟡 Security implementation pendiente
```

---

# 68. 🔴 Hallazgo actual — Moderation de Alerts

Las Rules temporales actuales permiten que cualquier usuario autenticado realice:

```text
pending
→ approved
```

o:

```text
pending
→ rejected
```

si la operación modifica únicamente `status`.

Esto significa que actualmente:

```text
AUTHENTICATED USER
+
PENDING ALERT
=
MODERATION CAPABILITY
```

Esto **no corresponde al modelo v0.4**.

Debe mantenerse únicamente porque forma parte del prototipo y ya fue probado.

La implementación definitiva deberá exigir una capacidad equivalente a:

```text
alert.approve
```

y un rol/scope compatible.

### Estado

```text
🔴 Problema de seguridad actual
🟢 Conocido y documentado
🔵 Pendiente de reemplazo
```

---

# 69. 🔴 Hallazgo actual — Admin por Frontend

El prototipo actual contiene una referencia de administrador dentro del JavaScript y un flujo de PIN para mostrar el panel administrativo.

Este mecanismo puede servir para:

```text
UI de prototipo
```

pero no debe considerarse autorización real.

El navegador puede ser inspeccionado y manipulado.

Por lo tanto:

```text
ADMIN_EMAIL
+
ADMIN PIN
+
frontend condition
```

no deberán ser la fuente de autoridad de producción.

El futuro acceso administrativo deberá depender de:

```text
Firebase Auth
+
Platform Role
+
Permission
+
Scope
+
Firestore Rules / Trusted Backend
```

### Estado

```text
🔴 No apto como seguridad de producción
🟢 Aceptable únicamente como mecanismo temporal de UI
🔵 Será reemplazado durante Auth/User Foundation
```

---

# 70. 🟡 Hallazgo actual — localStorage

El prototipo todavía utiliza `localStorage` para determinados datos funcionales, incluyendo partes relacionadas con:

```text
chat
success comments
radius
theme
```

Esto no contradice la arquitectura porque todavía no se han implementado esos módulos en backend.

Sin embargo:

```text
localStorage ≠ fuente confiable de datos
```

No deberá utilizarse para:

```text
authorization
ownership
roles
permissions
moderation
medical records
security state
```

Los datos persistentes del ecosistema deberán migrarse progresivamente a los sistemas correspondientes.

---

# 71. 🟡 Hallazgo actual — Demo GPS

El prototipo utiliza coordenadas de demostración.

Esto es compatible con el estado actual del roadmap porque:

```text
Real GPS
```

está fuera del alcance de v0.4.

No debe interpretarse como arquitectura definitiva de ubicación.

### Estado

```text
🟢 Correcto para prototipo
🔵 Real GPS pertenece a v0.5
```

---

# 72. 🟡 Hallazgo actual — Default Alerts

El código contiene datos de demostración mediante:

```text
defaultAlerts
```

mientras que la aplicación también utiliza Firestore.

Esto puede provocar que existan dos fuentes conceptuales de datos:

```text
Demo Data
+
Cloud Data
```

No representa un problema arquitectónico mientras se trate como fallback/prototipo.

Antes de una versión de producción deberá existir una fuente de verdad claramente definida.

### Estado

```text
🟡 Deuda técnica conocida
```

---

# 73. 🟡 Hallazgo actual — Global Alerts Query

El prototipo utiliza una consulta global de:

```text
alerts
orderBy(createdAt, desc)
```

Esto es aceptable para una etapa inicial.

No debe considerarse una estrategia global definitiva para millones de alertas.

El crecimiento futuro requerirá:

```text
pagination
filters
geographic querying
scoped queries
indexes
limits
possibly geographic partitioning
```

### Estado

```text
🟢 Correcto para prototipo
🔵 Escalabilidad futura pendiente
```

---

# 74. 🟢 Compatibilidad con Roadmap

Los hallazgos no requieren adelantar funcionalidades fuera de v0.4.

Continúan fuera de alcance:

```text
Real GPS
Active Devices
QR/NFC Resolver
Full Medical System
Travel
Notifications Engine
Chat
Community
Payments
Marketplace
Full Event/Rule/Action Engine
```

Esto mantiene vigente el principio:

> Construir hoy lo que sabemos que necesitaremos mañana, sin construir mañana antes de tiempo.

---

# 75. Architecture Debt Register

| Elemento                          | Estado | Acción                  |
| --------------------------------- | ------ | ----------------------- |
| Temporary alert moderation        | 🔴     | Reemplazar              |
| Frontend admin authorization      | 🔴     | Reemplazar              |
| Guardian permissions protection   | 🟡     | Implementar protección  |
| Membership permissions protection | 🟡     | Implementar protección  |
| Pet + Owner creation flow         | 🟡     | Definir implementación  |
| Emergency resolver                | 🔵     | Futuro                  |
| LocalStorage persistence          | 🟡     | Migración por módulo    |
| Demo GPS                          | 🟢     | Mantener en v0.4        |
| Default demo alerts               | 🟡     | Retirar progresivamente |
| Global alert query                | 🟡     | Escalar posteriormente  |
| Events trusted creation           | 🟡     | Implementar protección  |
| Full audit system                 | 🔵     | Futuro/trusted backend  |

---

# 76. 🔵 Decisiones pendientes antes de código

Las siguientes decisiones no bloquean el inicio de Auth/User Foundation:

```text
1. Pet creation + initial OWNER flow
2. Exact emergency access policy
3. Exact Event trusted-write policy
```

Podrán resolverse cuando lleguemos al módulo correspondiente.

No es necesario detener todo el proyecto por estas decisiones.

---

# 77. 🟢 Go / No-Go

## Arquitectura

```text
GO 🟢
```

La arquitectura v0.4 puede avanzar a implementación.

## Data Model

```text
GO 🟢
```

El modelo inicial es suficientemente estable para comenzar.

## Roles / Permissions

```text
GO 🟢
```

Puede comenzar la implementación base.

## Security Rules

```text
GO 🟡
```

El diseño está listo, pero las Rules definitivas deberán implementarse y probarse por colección.

## Current Prototype

```text
KEEP 🟢
```

No se recomienda reescribirlo todavía.

---

# 78. Conclusión

La auditoría no detectó una contradicción estructural que obligue a regresar al Blueprint.

La arquitectura puede avanzar.

Los principales problemas detectados pertenecen a la diferencia entre:

```text
PROTOTYPE
```

y:

```text
PLATFORM FOUNDATION
```

y ya están identificados.

Por lo tanto, el siguiente paso recomendado es:

```text
AUTH / USER FOUNDATION
```

---

# 79. Estado final de auditoría

```text
Master Blueprint v1.4
    🟢 APPROVED

Technical Design v0.4
    🟢 APPROVED

Firestore Schema
    🟢 APPROVED

Permission Matrix
    🟢 APPROVED

Security Rules Design
    🟢 APPROVED FOR IMPLEMENTATION

Architecture Cross-Audit
    🟢 PASSED

Known Security Debt
    🟡 DOCUMENTED

Current Prototype
    🟢 PRESERVE

Auth/User Foundation
    🔵 NEXT
```

## Regla de transición

> **No vamos a rehacer PawFinds. Vamos a construir la nueva fundación alrededor de lo que ya funciona, migrando cada módulo de forma controlada y sin romper el prototipo existente.**
# PAWFINDs — Auth / User Foundation v0.4

## 1. Propósito

El módulo Auth / User Foundation establece la identidad base de PawFinds.

Su responsabilidad es conectar:

Firebase Authentication
↓
Identidad del usuario
↓
`users/{uid}`
↓
Estado del usuario
↓
Futuras capas de roles, permisos, relaciones y scopes.

Este módulo NO implementa todavía:

* Pet Core
* Pet Guardians
* Organizations
* Memberships
* Events
* Medical
* Devices
* QR/NFC
* Notifications
* Community
* Payments
* Full moderation authorization

Su objetivo es construir una identidad de usuario sólida sobre la cual puedan depender los módulos posteriores.

---

# 2. Principio fundamental

En PawFinds existen dos conceptos diferentes:

### Authentication

Responde:

> ¿Quién es esta persona?

Firebase Authentication es la fuente de identidad.

### Authorization

Responde:

> ¿Qué puede hacer esta persona?

La autorización será implementada posteriormente mediante:

* Platform Roles
* Organization Roles
* Pet Relationships
* Permissions
* Scopes
* Resource State
* Firestore Rules
* Trusted Backend

Por lo tanto:

```text
Firebase Auth
     ↓
Identity
     ↓
users/{uid}
     ↓
Authorization layers
```

Autenticarse NO significa tener permisos administrativos.

---

# 3. Fuente primaria de identidad

La identidad técnica principal será:

```text
Firebase Authentication UID
```

El UID será utilizado como:

```text
users/{uid}
```

El `uid` será estable mientras exista la identidad de Firebase correspondiente.

No se utilizarán como identificadores principales:

* email
* nombre
* teléfono
* nombre de usuario
* documento de identidad
* posición geográfica

---

# 4. Modelo `users/{uid}`

Colección:

```text
users/{uid}
```

Schema v0.4:

| Campo         | Tipo      | Requerido | Control           |
| ------------- | --------- | --------: | ----------------- |
| `uid`         | string    |        Sí | Sistema           |
| `displayName` | string    |        No | Usuario / sistema |
| `email`       | string    |        No | Sistema           |
| `photoURL`    | string    |        No | Usuario / sistema |
| `status`      | string    |        Sí | Sistema           |
| `createdAt`   | timestamp |        Sí | Sistema           |
| `updatedAt`   | timestamp |        Sí | Sistema           |

Estados permitidos:

```text
ACTIVE
SUSPENDED
DISABLED
```

---

# 5. Significado de los estados

## ACTIVE

El usuario está habilitado para utilizar las funciones permitidas por su identidad y autorización.

## SUSPENDED

La identidad continúa existiendo, pero determinadas operaciones quedan bloqueadas.

Puede utilizarse para:

* moderación
* seguridad
* abuso
* investigación
* restricciones temporales

La suspensión NO significa eliminar la identidad.

## DISABLED

La cuenta queda deshabilitada para utilizar la plataforma.

El registro histórico puede permanecer.

---

# 6. Reglas de identidad

El cliente no podrá modificar arbitrariamente:

```text
uid
createdAt
status
```

El usuario tampoco podrá utilizar el documento `users/{uid}` para otorgarse:

* roles
* permisos
* scopes
* privilegios administrativos
* membresías
* relaciones especiales

Estos pertenecen a capas de autorización independientes.

---

# 7. Creación del usuario

Cuando una persona se autentique por primera vez:

```text
Firebase Authentication
        ↓
UID
        ↓
¿Existe users/{uid}?
        ↓
NO
        ↓
Crear users/{uid}
```

El documento inicial deberá contener como mínimo:

```text
uid
displayName
email
photoURL
status = ACTIVE
createdAt
updatedAt
```

Las fechas importantes deberán utilizar timestamps generados de forma confiable por Firebase / backend.

---

# 8. Usuarios existentes

Si el usuario ya posee:

```text
users/{uid}
```

la autenticación NO deberá crear otro usuario.

Se deberá sincronizar únicamente la información de perfil permitida.

Ejemplo:

```text
Firebase Auth
     ↓
onAuthStateChanged(user)
     ↓
users/{user.uid}
```

Si existe:

```text
users/{uid}
```

se conserva la identidad existente.

---

# 9. Sincronización de perfil

Los siguientes datos pueden provenir de Firebase Authentication:

```text
displayName
email
photoURL
```

Pero debe distinguirse entre:

### Datos de identidad

Controlados principalmente por Firebase Authentication.

### Datos de plataforma

Controlados por PawFinds.

Ejemplo:

```text
Firebase Auth
├── uid
├── email
├── displayName
└── photoURL

PawFinds
├── status
├── createdAt
└── updatedAt
```

PawFinds no debe depender exclusivamente de los datos visuales proporcionados por Auth para determinar autorización.

---

# 10. Google Authentication

El proyecto actualmente utiliza:

```text
GoogleAuthProvider
signInWithPopup()
```

Esta integración se conserva.

No se reemplazará el proveedor actual.

La evolución será:

```text
Google Login
     ↓
Firebase Authentication
     ↓
Firebase UID
     ↓
users/{uid}
```

Posteriormente podrán agregarse otros proveedores sin cambiar el modelo fundamental.

---

# 11. `currentUser`

El frontend puede mantener:

```text
currentUser
```

como referencia temporal de la sesión autenticada.

Sin embargo:

```text
currentUser
```

NO es una fuente de autorización.

Tampoco deberá utilizarse para decidir:

```text
"si currentUser.email === ADMIN_EMAIL"
```

ni:

```text
"si currentUser existe → es administrador"
```

La sesión identifica al usuario.

La autorización determinará qué puede hacer.

---

# 12. `onAuthStateChanged`

La aplicación continuará utilizando:

```text
onAuthStateChanged(auth, ...)
```

como mecanismo para reaccionar a:

* inicio de sesión
* cierre de sesión
* restauración de sesión
* cambio de usuario

Flujo:

```text
Firebase Auth
      ↓
onAuthStateChanged
      ↓
currentUser
      ↓
cargar users/{uid}
      ↓
validar estado
      ↓
actualizar interfaz
```

---

# 13. Estado Auth vs estado PawFinds

Debe existir una separación explícita:

```text
AUTH STATE
```

y:

```text
PAWFINDs USER STATE
```

Ejemplo:

```text
Firebase Auth:
usuario autenticado

PawFinds:
status = SUSPENDED
```

Resultado:

El usuario puede seguir teniendo una identidad Firebase válida, pero PawFinds puede impedir determinadas operaciones.

Por esto:

```text
Firebase Auth ≠ autorización completa
```

---

# 14. Regla de estado

Conceptualmente:

```text
No autenticado
    ↓
sin acceso a funciones privadas

Autenticado + ACTIVE
    ↓
acceso según permisos

Autenticado + SUSPENDED
    ↓
acceso restringido

Autenticado + DISABLED
    ↓
acceso bloqueado
```

El estado deberá ser evaluado junto con las demás capas de autorización.

---

# 15. Roles

Este módulo NO asignará todavía roles administrativos complejos.

Los roles ya definidos arquitectónicamente son:

### Platform Roles

```text
USER
MODERATOR
ADMIN
```

Estos pertenecen a la capa de autorización.

NO deberán almacenarse como información editable por el usuario dentro de:

```text
users/{uid}
```

La implementación definitiva de roles se realizará en la siguiente capa de seguridad correspondiente.

---

# 16. Custom Claims

Custom Claims quedan limitados a información pequeña y estable relacionada con autorización.

No se utilizarán para almacenar:

* mascotas
* guardians
* memberships
* permisos extensos
* listas grandes
* datos de perfil
* información médica

Ejemplo conceptual permitido:

```text
platformRole = USER
```

Pero esto será implementado posteriormente cuando la infraestructura de autorización esté preparada.

---

# 17. Seguridad de `users/{uid}`

Principio:

```text
request.auth.uid == uid
```

NO significa automáticamente:

```text
el usuario puede modificar cualquier campo
```

Las Rules deberán diferenciar entre:

### Campos modificables

Datos de perfil permitidos.

### Campos protegidos

```text
uid
status
createdAt
```

Y posteriormente:

```text
roles
permissions
scopes
```

Estos no deben poder ser autoasignados desde el cliente.

---

# 18. SUSPENDED y DISABLED

Un usuario no podrá cambiar su propio:

```text
status
```

Por ejemplo, una petición como:

```text
status = ADMIN
```

o:

```text
status = ACTIVE
```

no debe tener efecto simplemente porque provenga del usuario autenticado.

El cambio de estado será una operación privilegiada.

Posteriormente podrá ejecutarse mediante:

* Admin autorizado
* Trusted Backend
* flujo de moderación
* reglas específicas

---

# 19. Eliminación

En v0.4 no se define una eliminación destructiva completa de usuarios.

Principio:

```text
deshabilitar ≠ borrar
```

Esto permite conservar:

* integridad histórica
* relaciones
* auditoría futura
* referencias
* eventos

Los procesos de eliminación definitiva quedan fuera del alcance actual.

---

# 20. Privacidad

El documento:

```text
users/{uid}
```

NO será considerado un perfil público.

Información como:

```text
email
```

no deberá exponerse globalmente simplemente porque exista en Firestore.

La información pública de mascotas tendrá posteriormente su propio recurso:

```text
pet_public_profiles/{petId}
```

Esto mantiene separadas:

```text
identidad del usuario
```

de:

```text
identidad pública de la mascota
```

---

# 21. Relación con futuras mascotas

El usuario NO tendrá una lista de mascotas almacenada directamente como fuente principal dentro de:

```text
users/{uid}
```

La relación futura será:

```text
PET
   ↓
pet_guardians
   ↓
USER
```

Esto permite:

* múltiples usuarios por mascota
* múltiples mascotas por usuario
* cuidadores
* veterinarios
* organizaciones
* cambios de responsables
* permisos diferentes

---

# 22. Relación con Organizations

Un usuario tampoco tendrá dentro de `users/{uid}` una lista rígida de organizaciones.

La relación será:

```text
USER
 ↓
MEMBERSHIP
 ↓
ORGANIZATION
```

Esto mantiene:

```text
User ≠ Organization ≠ Membership
```

---

# 23. Auditoría

La creación y cambios críticos del usuario deberán poder auditarse posteriormente mediante:

```text
events/{eventId}
```

o el sistema de auditoría correspondiente.

Especialmente:

* suspensión
* habilitación
* deshabilitación
* cambios administrativos
* modificaciones sensibles

El frontend no será la autoridad final para registrar eventos críticos.

---

# 24. Compatibilidad con el prototipo actual

El prototipo actual ya posee:

```text
initializeApp()
getAuth()
GoogleAuthProvider
signInWithPopup()
onAuthStateChanged()
currentUser
```

Por lo tanto:

### NO se hará

* reemplazar Firebase Auth
* cambiar Google Login innecesariamente
* rehacer toda la interfaz
* modificar el diseño visual
* migrar todavía `alerts`
* implementar Pet Core
* implementar Guardians
* implementar Organizations

### SÍ se hará

Convertir la autenticación actual en una verdadera base de identidad PawFinds.

---

# 25. Migración conceptual

Actualmente:

```text
Firebase Auth
      ↓
currentUser
```

Objetivo:

```text
Firebase Auth
      ↓
currentUser
      ↓
users/{uid}
      ↓
User State
      ↓
Future Authorization
```

La aplicación seguirá funcionando durante la transición.

---

# 26. Flujo objetivo

```text
┌──────────────────────────┐
│ Usuario                  │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Firebase Authentication  │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Firebase UID             │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ users/{uid}              │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ User Status              │
│ ACTIVE / SUSPENDED /     │
│ DISABLED                 │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Authorization Layer      │
│ Roles + Relations +      │
│ Permissions + Scopes     │
└──────────────────────────┘
```

---

# 27. Qué queda fuera de este módulo

No se implementará todavía:

* Pet creation
* Pet guardians
* Organizations
* Memberships
* Admin role system completo
* Custom Claims completos
* Event Engine
* Audit Engine completo
* Trusted Backend completo
* Medical
* Devices
* QR/NFC
* Travel
* Notifications
* Community
* Payments

---

# 28. Plan de implementación

El módulo se implementará en este orden:

### Paso 1 — Revisar Auth actual

Verificar:

* Firebase initialization
* Auth instance
* Google provider
* login
* logout
* `onAuthStateChanged`
* `currentUser`

### Paso 2 — Crear User Foundation

Implementar:

```text
users/{uid}
```

con el schema aprobado.

### Paso 3 — Sincronización

Implementar:

```text
Auth → User Document
```

sin duplicar usuarios.

### Paso 4 — User State

Implementar:

```text
ACTIVE
SUSPENDED
DISABLED
```

con protección adecuada.

### Paso 5 — Security Rules

Actualizar las Rules necesarias para `users/{uid}`.

Sin modificar todavía las reglas temporales de `alerts` más allá de lo estrictamente necesario para evitar regresiones.

### Paso 6 — Pruebas

Probar:

* primer login
* login repetido
* logout
* restauración de sesión
* creación de usuario
* actualización permitida
* intento de modificar `uid`
* intento de modificar `createdAt`
* intento de modificar `status`
* usuario suspendido
* usuario deshabilitado

### Paso 7 — Auditoría

Revisar:

* seguridad
* integridad
* duplicación
* regresiones
* compatibilidad con `alerts`
* compatibilidad futura con Pet Core

---

# 29. Criterios de aceptación

Auth/User Foundation será considerado terminado cuando:

* Firebase Authentication funcione.
* Google Login continúe funcionando.
* Cada usuario autenticado tenga un único `users/{uid}`.
* `uid` coincida con Firebase Auth UID.
* Los datos básicos puedan sincronizarse correctamente.
* `status` exista y utilice únicamente estados válidos.
* El usuario no pueda autoasignarse privilegios.
* El usuario no pueda modificar `uid`.
* El usuario no pueda modificar `createdAt`.
* El usuario no pueda modificar arbitrariamente `status`.
* Logout continúe funcionando.
* La sesión pueda restaurarse correctamente.
* Las funciones actuales de PawFinds continúen funcionando.
* No se rompa `alerts`.
* No se implemente autorización administrativa mediante email o PIN del frontend.
* El sistema quede preparado para Roles + Permissions + Scopes.

---

# 30. Estado del módulo

```text
AUTH / USER FOUNDATION v0.4

Diseño conceptual: 🟢 APROBADO
Schema:            🟢 APROBADO
Arquitectura:      🟢 APROBADA
Implementación:    🔵 PENDIENTE
Pruebas:           🔵 PENDIENTES
Auditoría:         🔵 PENDIENTE
```

---

# 31. Decisión arquitectónica cerrada

La identidad de PawFinds será:

```text
Firebase Auth UID
        +
users/{uid}
```

Firebase Authentication responde:

> ¿Quién eres?

PawFinds responde posteriormente:

> ¿Qué estado tienes?

Y la capa de autorización responderá:

> ¿Qué puedes hacer?

Esta separación queda como fundamento permanente de PawFinds.

---

# 32. Regla de oro

> **AUTHENTICATION IDENTIFICA.
> USER FOUNDATION REPRESENTA.
> AUTHORIZATION AUTORIZA.
> SECURITY RULES PROTEGEN.
> TRUSTED BACKEND EJECUTA OPERACIONES CRÍTICAS.**

No se mezclan responsabilidades.
# PAWFINDs — User Creation & Synchronization Design v0.4

## 1. Objetivo

Definir el flujo mediante el cual un usuario autenticado en Firebase Authentication obtiene y mantiene su documento correspondiente en:

```text
users/{uid}
```

Este documento representa la identidad del usuario dentro de PawFinds.

El objetivo es garantizar:

* un único documento por usuario;
* correspondencia exacta entre Firebase Auth UID y `users/{uid}`;
* creación automática al primer acceso;
* sincronización controlada de datos básicos;
* protección de campos críticos;
* compatibilidad con futuros roles, permisos y scopes;
* ausencia de duplicados;
* compatibilidad con el código actual de PawFinds.

---

# 2. Identidad principal

La identidad estructural será:

```text
Firebase Authentication UID
```

Por lo tanto:

```text
Firebase Auth user.uid
        ↓
users/{user.uid}
```

Ejemplo conceptual:

```text
Firebase Auth
UID = ABC123

Firestore
users/ABC123
```

El UID será la relación primaria entre Authentication y PawFinds.

---

# 3. No utilizar email como identificador

El email NO será utilizado como clave primaria.

No se utilizará:

```text
users/{email}
```

ni:

```text
users/{encodedEmail}
```

ni ningún esquema equivalente.

Razones:

* un usuario puede cambiar su email;
* proveedores distintos pueden representar identidades de manera diferente;
* el email es información personal;
* no representa la identidad estructural de PawFinds.

El UID permanece como ancla técnica.

---

# 4. Flujo de primer acceso

Cuando un usuario inicia sesión:

```text
Usuario
   ↓
Google / Firebase Auth
   ↓
signInWithPopup()
   ↓
Firebase User
   ↓
user.uid
   ↓
buscar users/{uid}
```

Después:

```text
¿Existe users/{uid}?
```

### Si NO existe:

```text
Crear users/{uid}
```

### Si SÍ existe:

```text
No crear otro documento.
Sincronizar solamente campos permitidos.
```

---

# 5. Flujo completo

```text
┌─────────────────────────┐
│ Usuario inicia sesión   │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Firebase Authentication │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Firebase UID            │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ users/{uid}             │
└────────────┬────────────┘
             ↓
       ¿Existe?
       /       \
     NO         SÍ
     ↓          ↓
  Crear      Sincronizar
     \          /
      \        /
       ↓      ↓
     User Foundation
             ↓
       Evaluar status
```

---

# 6. Documento inicial

Al crearse por primera vez:

```text
users/{uid}
```

deberá contener:

```text
uid
displayName
email
photoURL
status
createdAt
updatedAt
```

Ejemplo conceptual:

```text
{
  uid: "firebase-uid",
  displayName: "Nombre del usuario",
  email: "usuario@example.com",
  photoURL: "https://...",
  status: "ACTIVE",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

El ejemplo es conceptual y no constituye todavía código de implementación.

---

# 7. Fuente de cada campo

## Firebase Authentication

Puede proporcionar:

```text
uid
displayName
email
photoURL
```

## PawFinds

Controla:

```text
status
createdAt
updatedAt
```

La separación conceptual es:

```text
Firebase Auth
├── uid
├── displayName
├── email
└── photoURL

PawFinds
├── status
├── createdAt
└── updatedAt
```

---

# 8. Campo `uid`

```text
uid
```

### Fuente

Firebase Authentication.

### Regla

Debe coincidir exactamente con:

```text
document ID
```

Por ejemplo:

```text
users/ABC123
```

debe contener:

```text
uid: "ABC123"
```

El usuario no podrá modificar este valor.

---

# 9. Campo `status`

Estados válidos:

```text
ACTIVE
SUSPENDED
DISABLED
```

### Valor inicial

Todo usuario nuevo será creado como:

```text
ACTIVE
```

salvo que en una futura política de seguridad se defina un proceso especial de revisión.

### Regla

El cliente no podrá autoasignarse ni cambiar arbitrariamente:

```text
status
```

---

# 10. Campo `createdAt`

Se establece únicamente durante la creación inicial.

No debe modificarse posteriormente.

Su función es representar:

> cuándo se creó la identidad PawFinds.

No debe actualizarse en cada login.

---

# 11. Campo `updatedAt`

Representa la última actualización válida del documento PawFinds.

Puede actualizarse cuando cambien campos permitidos.

Ejemplo:

```text
displayName
photoURL
```

No significa:

> última vez que inició sesión.

Para actividad de sesión o eventos futuros se utilizarán mecanismos independientes.

---

# 12. Sincronización en login posterior

Supongamos:

```text
users/ABC123
```

ya existe.

El usuario vuelve a iniciar sesión.

El sistema NO deberá:

```text
crear users/ABC123-2
```

ni:

```text
crear otro documento
```

Debe reutilizar:

```text
users/ABC123
```

---

# 13. Sincronización permitida

Cuando Firebase Auth proporcione información actualizada, PawFinds podrá sincronizar campos de perfil permitidos:

```text
displayName
email
photoURL
```

La sincronización debe ser controlada.

No deberá sobrescribir:

```text
status
createdAt
```

---

# 14. Regla crítica: sincronización ≠ sobrescritura total

No se debe utilizar un flujo equivalente conceptualmente a:

```text
reemplazar todo users/{uid}
```

porque podría eliminar campos que PawFinds agregue posteriormente.

Por ejemplo, en futuras versiones podrían existir:

```text
preferences
locale
notificationSettings
verification
privacySettings
```

Por eso la sincronización deberá modificar únicamente campos conocidos y permitidos.

---

# 15. Preservación de datos futuros

El proceso deberá respetar:

```text
campos administrados por PawFinds
```

y:

```text
campos provenientes de Firebase Auth
```

Por ejemplo:

```text
Firebase Auth
    ↓
displayName
email
photoURL

PawFinds
    ↓
status
createdAt
updatedAt
future platform data
```

Una actualización del perfil no deberá destruir la información de PawFinds.

---

# 16. Usuarios con documento existente pero incompleto

Puede existir un documento creado durante una transición que no tenga todos los campos esperados.

El sistema deberá poder completar los campos faltantes permitidos.

Ejemplo:

```text
users/ABC123
```

existe pero carece de:

```text
photoURL
```

Si Firebase Auth proporciona ese dato, puede sincronizarse.

Sin embargo:

```text
status
```

no debe ser creado por el cliente con un valor arbitrario.

---

# 17. Protección contra duplicados

La estructura:

```text
users/{uid}
```

elimina conceptualmente el problema de duplicados por usuario.

No se utilizará:

```text
addDoc(collection(db, "users"), ...)
```

para crear usuarios.

La identidad debe estar determinada por:

```text
uid
```

Por tanto, el documento debe ser:

```text
doc(db, "users", user.uid)
```

conceptualmente.

---

# 18. Primer acceso simultáneo

Existe una situación especial:

Dos procesos podrían intentar inicializar el mismo usuario casi simultáneamente.

Por eso la implementación final deberá utilizar una operación que no dependa de:

```text
"pregunto si existe → después creo"
```

como única garantía.

La operación deberá diseñarse para que:

```text
users/{uid}
```

siga siendo una única identidad.

La creación inicial y las Rules deberán complementarse.

---

# 19. Regla de seguridad fundamental

El cliente podrá trabajar únicamente con su propio documento:

```text
users/{request.auth.uid}
```

Un usuario autenticado como:

```text
ABC123
```

no deberá poder modificar:

```text
users/XYZ999
```

simplemente porque conozca el UID.

Conceptualmente:

```text
request.auth.uid == userId
```

será una condición fundamental de las Rules.

---

# 20. Pero identidad no significa autorización total

Aunque:

```text
request.auth.uid == userId
```

sea verdadero, eso NO significa que el usuario pueda modificar:

```text
status
roles
permissions
scopes
```

La autorización deberá proteger estos campos.

---

# 21. Campos inicialmente protegidos

Los siguientes campos quedan protegidos:

```text
uid
status
createdAt
```

Y posteriormente deberán quedar igualmente protegidos:

```text
platformRole
permissions
scopes
verification
security state
```

si llegan a formar parte del documento o de recursos relacionados.

---

# 22. Perfil editable

En esta etapa, los datos de perfil que podrán considerarse modificables por el usuario son:

```text
displayName
photoURL
```

El tratamiento de:

```text
email
```

se mantiene principalmente ligado a Firebase Authentication.

No se utilizará como mecanismo de autorización.

---

# 23. Estado SUSPENDED

Si:

```text
users/{uid}.status == "SUSPENDED"
```

el usuario sigue existiendo.

Pero las capas de autorización deberán limitar sus acciones.

El sistema no debe:

```text
borrar automáticamente el usuario
```

ni:

```text
crear una nueva identidad
```

---

# 24. Estado DISABLED

Si:

```text
status == "DISABLED"
```

el acceso a funciones de PawFinds deberá quedar bloqueado según la política de autorización.

El registro histórico permanece.

La deshabilitación de Firebase Authentication y el estado PawFinds son conceptos relacionados pero distintos y deberán coordinarse mediante una operación autorizada.

---

# 25. No confiar en el frontend

El frontend puede mostrar:

```text
Usuario activo
```

pero eso no constituye seguridad.

La seguridad real deberá existir posteriormente en:

```text
Firestore Rules
+
Trusted Backend
```

Por tanto:

```text
botón oculto ≠ seguridad
```

y:

```text
JavaScript ≠ autoridad
```

---

# 26. Compatibilidad con el Auth actual

Actualmente PawFinds ya tiene:

```text
onAuthStateChanged()
currentUser
GoogleAuthProvider
signInWithPopup()
```

No se reemplazará ese sistema.

La evolución será:

```text
ANTES

Firebase Auth
     ↓
currentUser
```

hacia:

```text
DESPUÉS

Firebase Auth
     ↓
currentUser
     ↓
users/{uid}
     ↓
status
     ↓
future authorization
```

---

# 27. Integración con `alerts`

En esta etapa NO se migrará completamente `alerts`.

Sin embargo, se establece una decisión importante:

El futuro vínculo de un reporte con su creador deberá utilizar:

```text
userId = Firebase Auth UID
```

en lugar de depender de:

```text
email
```

como identificador.

Esto será parte de la futura evolución de Alerts.

---

# 28. No modificar todavía el modelo de Alerts

Durante esta etapa:

```text
alerts
```

continúa funcionando con el modelo actual.

No se realizará una migración simultánea de:

```text
alerts
+
users
```

porque aumentaría innecesariamente el riesgo de regresión.

La migración de Alerts será una tarea independiente.

---

# 29. Relación futura con Pet Core

Una vez construido:

```text
users/{uid}
```

podremos construir:

```text
pets/{petId}
```

y después:

```text
pet_guardians/{guardianId}
```

La relación será:

```text
USER
 ↓
PET GUARDIAN
 ↓
PET
```

Esto evita guardar una lista rígida de mascotas dentro del usuario.

---

# 30. Relación futura con Organizations

De forma equivalente:

```text
USER
 ↓
MEMBERSHIP
 ↓
ORGANIZATION
```

El usuario no tendrá que almacenar una lista de organizaciones dentro de `users/{uid}` como fuente principal.

---

# 31. Eventos futuros

La creación del usuario podrá generar posteriormente un evento:

```text
USER_CREATED
```

Sin embargo, el Event Foundation todavía no será implementado dentro de este paso.

La creación del documento y el sistema completo de eventos permanecen separados.

---

# 32. Operación conceptual final

El flujo deseado será:

```text
onAuthStateChanged(user)

        ↓

¿user existe?

        ↓

Obtener user.uid

        ↓

users/{user.uid}

        ↓

¿Existe?

   ┌────┴────┐
   ↓         ↓
  NO         SÍ
   ↓         ↓
Crear      Sincronizar
   │         │
   └────┬────┘
        ↓
Validar status
        ↓
Continuar sesión
```

---

# 33. Criterios de aceptación

El diseño será considerado correctamente implementado cuando:

* cada usuario autenticado tenga un único `users/{uid}`;
* el UID de Firebase coincida con el document ID;
* el primer login cree el documento;
* los siguientes logins reutilicen el mismo documento;
* no se creen duplicados;
* `status` comience como `ACTIVE`;
* `createdAt` permanezca estable;
* `updatedAt` se actualice correctamente;
* los datos de Firebase Auth permitidos puedan sincronizarse;
* los datos administrados por PawFinds no sean sobrescritos;
* el usuario no pueda modificar `status`;
* el usuario no pueda modificar `uid`;
* el usuario no pueda modificar `createdAt`;
* un usuario no pueda modificar otro `users/{uid}`;
* la estructura quede preparada para autorización futura;
* `alerts` continúe funcionando sin migración en esta etapa.

---

# 34. Estado

```text
USER CREATION & SYNCHRONIZATION v0.4

Diseño:              🟢 APROBADO PARA IMPLEMENTACIÓN
Schema:              🟢 CONSISTENTE
Duplicados:          🟢 CONTROLADOS CON UID
Protección:          🟢 DEFINIDA
Integración Auth:    🟢 COMPATIBLE
Integración Alerts:  🟢 SIN CAMBIOS
Código:              🔵 PENDIENTE
Rules:               🔵 PENDIENTES
Pruebas:             🔵 PENDIENTES
Auditoría:           🔵 PENDIENTE
```

---

# 35. Decisión cerrada

La identidad de usuario de PawFinds queda definida como:

```text
Firebase Authentication UID
        =
users/{uid}.uid
        =
users/{uid} document ID
```

No se utilizarán emails, nombres u otros datos variables como identidad estructural.

La creación de usuario será **idempotente**: iniciar sesión múltiples veces debe producir una única identidad PawFinds.

La sincronización será **selectiva**, no una sobrescritura completa del documento.

Los campos críticos pertenecen a PawFinds y no pueden ser autoasignados desde el cliente.

---

# 36. Regla de oro del User Foundation

> **UN USUARIO DE FIREBASE = UNA IDENTIDAD PAWFINDs = UN `users/{uid}`.**

La autenticación identifica al usuario.

`users/{uid}` representa al usuario dentro del ecosistema.

La autorización decidirá posteriormente qué puede hacer.

Las Rules y el Trusted Backend protegerán las operaciones críticas.
# PAWFINDs — User Foundation Firestore Rules Design v0.4

## 1. Objetivo

Definir las reglas de seguridad para:

```text
users/{uid}
```

Estas Rules constituyen la primera capa real de protección del User Foundation.

El objetivo es garantizar que:

* un usuario autenticado pueda acceder únicamente a su propia identidad;
* un usuario no pueda modificar otro usuario;
* los campos críticos no puedan autoasignarse;
* `status` no pueda ser manipulado desde el cliente;
* `createdAt` permanezca protegido;
* `uid` permanezca consistente;
* la estructura quede preparada para futuras roles y permisos.

---

# 2. Principio fundamental

La regla principal será:

```text
request.auth != null
&& request.auth.uid == uid
```

Esto significa:

> El usuario autenticado solamente puede operar sobre su propio documento.

Ejemplo:

```text
Usuario autenticado:
ABC123

Puede acceder:
users/ABC123

No puede acceder:
users/XYZ999
```

---

# 3. Lectura

En v0.4, un usuario autenticado podrá leer su propio documento:

```text
users/{request.auth.uid}
```

No se establece lectura pública.

Por tanto:

```text
Usuario autenticado + propio documento
→ PERMITIDO
```

```text
Usuario autenticado + documento ajeno
→ DENEGADO
```

```text
Usuario no autenticado
→ DENEGADO
```

---

# 4. Creación

El usuario podrá crear su propio documento durante la inicialización de su identidad.

Condiciones conceptuales:

```text
request.auth != null
request.auth.uid == uid
```

Además:

```text
request.resource.data.uid == uid
```

Esto evita que un usuario autenticado intente crear:

```text
users/ABC123
```

con:

```text
uid: "XYZ999"
```

---

# 5. Estado inicial

Durante la creación inicial:

```text
status == "ACTIVE"
```

El cliente no podrá crear directamente:

```text
SUSPENDED
DISABLED
```

Esto evita que una cuenta pueda alterar su propio estado de seguridad.

---

# 6. Campos permitidos durante la creación

El documento inicial solamente podrá contener los campos definidos por el User Foundation:

```text
uid
displayName
email
photoURL
status
createdAt
updatedAt
```

No se permitirá que el cliente introduzca arbitrariamente campos de seguridad futuros.

Por ejemplo, no deberá poder crear:

```text
role
permissions
scopes
isAdmin
isModerator
verified
```

---

# 7. `uid`

Durante la creación:

```text
request.resource.data.uid == uid
```

Durante una actualización:

```text
resource.data.uid == request.resource.data.uid
```

Por tanto, el UID no puede cambiar.

---

# 8. `createdAt`

Durante la creación:

```text
createdAt
```

debe establecerse.

Durante una actualización:

```text
createdAt
```

debe permanecer idéntico.

Conceptualmente:

```text
request.resource.data.createdAt
==
resource.data.createdAt
```

Esto evita que un usuario pueda alterar artificialmente la fecha de creación.

---

# 9. `status`

`status` es un campo controlado por PawFinds.

El cliente podrá crear:

```text
ACTIVE
```

pero no podrá modificar posteriormente:

```text
ACTIVE → SUSPENDED
ACTIVE → DISABLED
```

ni:

```text
SUSPENDED → ACTIVE
DISABLED → ACTIVE
```

desde una operación normal del cliente.

Los cambios administrativos de estado serán una capacidad futura y separada.

---

# 10. `updatedAt`

`updatedAt` podrá cambiar cuando se actualicen campos permitidos.

La implementación deberá utilizar un timestamp generado por servidor.

El cliente no debe poder utilizar este campo para falsear información temporal.

---

# 11. Campos editables inicialmente

En esta fase:

```text
displayName
photoURL
```

serán los campos de perfil editables.

`email` será tratado con especial cuidado porque procede de Firebase Authentication.

La sincronización de email deberá formar parte del flujo controlado de identidad y no convertirse en un mecanismo de autorización.

---

# 12. Regla de actualización

Una actualización normal deberá cumplir:

```text
request.auth != null
```

y:

```text
request.auth.uid == uid
```

y:

```text
resource.data.uid == request.resource.data.uid
```

y:

```text
resource.data.createdAt == request.resource.data.createdAt
```

y:

```text
resource.data.status == request.resource.data.status
```

Además, solamente podrán cambiar los campos expresamente permitidos.

---

# 13. Protección contra campos arbitrarios

No basta con bloquear algunos campos.

La estrategia recomendada es limitar las claves modificables.

Conceptualmente:

```text
affectedKeys()
    .hasOnly([
        "displayName",
        "photoURL",
        "email",
        "updatedAt"
    ])
```

La lista final deberá reflejar exactamente el flujo de sincronización implementado.

---

# 14. Importante: `email`

Existe una decisión técnica importante.

Firebase Authentication puede actualizar el email del usuario.

Por ello, si PawFinds sincroniza:

```text
email
```

deberá hacerlo como parte de un flujo controlado.

No debe utilizarse:

```text
email
```

para determinar:

```text
ADMIN
MODERATOR
OWNER
```

ni ninguna otra autorización.

---

# 15. Lectura de documentos ajenos

Aunque un usuario conozca el UID de otra persona:

```text
XYZ999
```

no podrá realizar:

```text
get(users/XYZ999)
```

La regla deberá evaluar:

```text
request.auth.uid == uid
```

---

# 16. Enumeración de usuarios

La arquitectura no permitirá que un usuario normal consulte libremente:

```text
users/
```

para obtener los perfiles privados de todos los usuarios.

Esto protege información personal y reduce la exposición innecesaria.

---

# 17. Eliminación

En v0.4:

```text
allow delete: false;
```

La eliminación directa desde el cliente queda prohibida.

La futura eliminación, desactivación o anonimización deberá ser una operación de ciclo de vida definida posteriormente.

---

# 18. Roles

Las Rules de `users` NO implementarán todavía:

```text
ADMIN
MODERATOR
```

ni otras capacidades administrativas.

El documento de usuario tampoco permitirá que el cliente cree:

```text
role
permissions
scopes
```

Estos conceptos pertenecen al modelo de autorización y se incorporarán mediante mecanismos controlados.

---

# 19. `users` no es un sistema de autorización completo

Aunque las Rules protejan:

```text
users/{uid}
```

esto no significa que el User Foundation ya tenga implementado:

```text
RBAC
ReBAC
Scopes
Platform roles
Organization roles
Pet permissions
```

Esos componentes pertenecen a módulos posteriores.

---

# 20. Relación con Firebase Authentication

El flujo conceptual será:

```text
Firebase Authentication
        ↓
       UID
        ↓
users/{uid}
        ↓
       status
        ↓
futuro sistema de autorización
```

Firebase Authentication demuestra que la identidad está autenticada.

Firestore Rules determinan qué puede hacer esa identidad con los datos.

---

# 21. Frontend no es autoridad

No se considerarán mecanismos de seguridad:

```text
if (user.email === ADMIN_EMAIL)
```

```text
if (isAdmin)
```

```text
if (localStorage.isAdmin)
```

```text
if (pinCorrecto)
```

Estos mecanismos podrán existir temporalmente en el prototipo por compatibilidad, pero no serán considerados parte de la seguridad del User Foundation.

---

# 22. Admin actual

El actual:

```text
Super Admin PIN
```

permanece temporalmente por compatibilidad con el prototipo.

No se modifica durante este paso.

Sin embargo:

```text
🔴 NO ES SEGURIDAD DE PRODUCCIÓN
```

La sustitución se realizará posteriormente mediante:

```text
Firebase Auth
+
Platform Role
+
Permission
+
Scope
+
Firestore Rules / Trusted Backend
```

---

# 23. Relación con `alerts`

Las Rules nuevas de:

```text
users/{uid}
```

no modificarán las Rules existentes de:

```text
alerts/{alertId}
```

Esto es deliberado.

Queremos evitar mezclar dos cambios de seguridad al mismo tiempo.

---

# 24. Reglas actuales vs reglas nuevas

## Reglas actuales

Actualmente PawFinds posee Rules temporales para:

```text
alerts/{alertId}
```

Estas continúan vigentes.

## Reglas nuevas

Se añadirá:

```text
users/{uid}
```

con las restricciones definidas en este documento.

La migración debe ser incremental.

---

# 25. Comportamiento esperado

### Caso A — usuario nuevo

```text
Google Auth
↓
UID ABC123
↓
users/ABC123 no existe
↓
CREATE
↓
status = ACTIVE
```

🟢 Permitido.

---

### Caso B — usuario existente

```text
Google Auth
↓
UID ABC123
↓
users/ABC123 existe
↓
UPDATE de campos permitidos
```

🟢 Permitido.

---

### Caso C — modificar otro usuario

```text
Usuario ABC123
↓
intenta modificar users/XYZ999
```

🔴 Denegado.

---

### Caso D — cambiar status

```text
Usuario ABC123
↓
ACTIVE → SUSPENDED
```

🔴 Denegado.

---

### Caso E — cambiar UID

```text
ABC123 → XYZ999
```

🔴 Denegado.

---

### Caso F — cambiar createdAt

```text
fecha original → fecha falsa
```

🔴 Denegado.

---

### Caso G — crear como administrador

Intento:

```text
{
  uid: "...",
  status: "ACTIVE",
  role: "ADMIN"
}
```

🔴 Denegado por esquema/regla.

---

### Caso H — eliminar usuario

```text
delete users/ABC123
```

🔴 Denegado.

---

# 26. Matriz de seguridad

| Operación              | Usuario propio | Usuario ajeno | No autenticado |
| ---------------------- | -------------: | ------------: | -------------: |
| Leer propio documento  |             🟢 |             — |             🔴 |
| Leer documento ajeno   |              — |            🔴 |             🔴 |
| Crear identidad propia |             🟢 |            🔴 |             🔴 |
| Cambiar displayName    |             🟢 |            🔴 |             🔴 |
| Cambiar photoURL       |             🟢 |            🔴 |             🔴 |
| Cambiar UID            |             🔴 |            🔴 |             🔴 |
| Cambiar createdAt      |             🔴 |            🔴 |             🔴 |
| Cambiar status         |             🔴 |            🔴 |             🔴 |
| Crear rol              |             🔴 |            🔴 |             🔴 |
| Crear permisos         |             🔴 |            🔴 |             🔴 |
| Eliminar usuario       |             🔴 |            🔴 |             🔴 |

---

# 27. Criterios de aceptación

Las Rules estarán correctamente implementadas cuando:

* un usuario pueda crear únicamente `users/{suUID}`;
* pueda leer únicamente su propio documento;
* pueda modificar únicamente su propio documento;
* `uid` no pueda cambiar;
* `createdAt` no pueda cambiar;
* `status` no pueda cambiar desde el cliente;
* no pueda autoasignarse roles;
* no pueda autoasignarse permisos;
* no pueda crear scopes;
* no pueda eliminar su identidad;
* no pueda modificar usuarios ajenos;
* usuarios no autenticados no tengan acceso;
* `alerts` continúe funcionando exactamente como antes.

---

# 28. Pruebas obligatorias

Antes de declarar este paso aprobado deberán probarse como mínimo:

### Test 1

Usuario nuevo → crear `users/{uid}`.

### Test 2

Segundo login → no crear duplicado.

### Test 3

Leer propio documento.

### Test 4

Intentar leer documento ajeno.

### Test 5

Modificar `displayName`.

### Test 6

Intentar modificar `status`.

### Test 7

Intentar modificar `uid`.

### Test 8

Intentar modificar `createdAt`.

### Test 9

Intentar insertar `role: ADMIN`.

### Test 10

Intentar eliminar usuario.

### Test 11

Cerrar sesión → intentar acceso sin autenticación.

### Test 12

Verificar que `alerts` continúa funcionando.

---

# 29. Estado del diseño

```text
USER FOUNDATION FIRESTORE RULES v0.4

Principio de identidad:       🟢 DEFINIDO
Lectura:                       🟢 DEFINIDA
Creación:                      🟢 DEFINIDA
Actualización:                 🟢 DEFINIDA
Campos protegidos:             🟢 DEFINIDOS
Eliminación:                   🟢 BLOQUEADA
Roles:                         🔵 FUTURO
Permissions:                   🔵 FUTURO
Scopes:                        🔵 FUTURO
Admin actual:                  🟡 TEMPORAL
Rules actuales de alerts:     🟡 TEMPORALES
Código:                        🔵 PENDIENTE
Pruebas:                       🔵 PENDIENTES
Auditoría:                     🔵 PENDIENTE
```

---

# 30. Decisión cerrada

La seguridad básica del User Foundation queda definida bajo esta regla conceptual:

> **UN USUARIO AUTENTICADO SOLO PUEDE OPERAR SOBRE SU PROPIA IDENTIDAD Y SOLO SOBRE LOS CAMPOS QUE EL MODELO LE PERMITE MODIFICAR.**

Los campos críticos:

```text
uid
status
createdAt
```

quedan fuera del control normal del cliente.

Los roles, permisos, scopes y capacidades administrativas se implementarán posteriormente mediante el modelo de autorización de PawFinds.

---

# 31. Regla de oro

```text
AUTHENTICATION
    ↓
¿Quién eres?
    ↓
Firebase UID

AUTHORIZATION
    ↓
¿Qué puedes hacer?
    ↓
Roles + Relaciones + Permisos + Scope

FIRESTORE RULES
    ↓
¿Esta operación está permitida?
```

El frontend solamente solicita la operación.

**Firestore es quien debe decidir si la operación está permitida.**
