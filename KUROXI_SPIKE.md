# Kuroxi connection spike

Primer spike offline de Kuroxi: máquina de estados de conexión y contrato inicial de DeviceStore.

## Propósito

Validar sin WhatsApp real:

- Estados explícitos.
- Una sola transición válida.
- Un solo reconnect en vuelo.
- Backoff exponencial.
- Límite de reintentos.
- Cancelación de timers.
- Generación de conexión.
- Desuscripción de listeners.
- Estado fatal irreversible.
- Namespaces aislados.
- Clonación defensiva de valores.
- Transacciones atómicas.
- Rollback ante error.
- Serialización de transacciones concurrentes.
- Versionado de commits.
- Cierre seguro del store.
- Parser y normalizador de direcciones PN/LID.
- Soporte para grupos, newsletters, broadcast, bot y hosted addresses.
- Rechazo de JIDs ambiguos o malformados.
- Event bus canónico con sensibilidad, correlación y generación de conexión.
- Listeners exactos, globales, one-shot y desuscripción.
- Inmutabilidad de eventos y aislamiento de errores de listeners.
- Taxonomía estructurada de errores con acción y recuperabilidad.
- Redacción automática de campos sensibles en detalles de errores.
- Capability Registry con estados stable/advanced/experimental/unsupported/unknown.
- Fallback explícito y rechazo de capabilities desconocidas.
- Message Resolver offline integrado al SessionRuntime.
- Desactivación explícita de funciones experimentales por defecto.
- Schema formal para texto, cards, listas, carruseles, rich response, catálogo, órdenes, polls y media.
- Validación de acciones, metadata, límites y contenido específico por tipo.
- Normalización e integración del schema con el Message Resolver.
- Builders inmutables para texto, cards, acciones y listas.
- Validación de builders a través del schema formal.
- Renderer HTML seguro para previews offline.
- Escape de HTML, placeholders de media y renderizado de mensajes enriquecidos.
- Pruebas contra inyección de HTML/JavaScript en previews.
- Encoder Registry y Message Compiler independientes del protocolo real.
- PreviewEncoder para verificar schema → capability → encoder → HTML.
- Mock Transport con ACK, fallos controlados y registro de envíos.
- DeliveryManager con retry, idempotencia y deduplicación.
- DeliveryStore persistente para estados pending/sending/retrying/acknowledged/failed/cancelled.
- Integración del ciclo de entrega con persistencia transaccional.
- FileDeviceStore con snapshots JSON versionados, escritura temporal, `rename` atómico y `fsync`.

## Verificación

```bash
npm test
```

Resultado verificado el 1 de octubre de 2026:

```text
80 tests passed
0 failed
```

## No incluido

Este spike no implementa todavía WebSocket real, Noise, Signal, auth, WhatsApp, media ni credenciales.
