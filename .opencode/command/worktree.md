---
description: Crea un git worktree local dentro de ./.worktrees usando un nombre derivado del argumento.
---

Necesito crear un worktree local con este comando base:

```powershell
git worktree add ./.worktrees/<nombre-del-worktree>
```

Argumento recibido: `$ARGUMENTS`

Instrucciones:

1. Analiza `$ARGUMENTS` completo como el contexto para nombrar el worktree. El argumento puede contener espacios y debe tratarse como una sola descripcion, no como multiples argumentos independientes.
2. Deriva `<nombre-del-worktree>` desde ese contexto usando un nombre corto, descriptivo y seguro para ruta:
   - usa minusculas;
   - reemplaza espacios y separadores por guiones;
   - elimina comillas, acentos, simbolos y caracteres no seguros para rutas;
   - evita nombres genericos como `worktree`, `branch`, `test` si hay mejor contexto;
   - si el argumento ya parece un nombre valido, usalo normalizado.
3. Si `$ARGUMENTS` esta vacio o no alcanza para inferir un nombre claro, pregunta una sola vez que nombre usar.
4. Antes de ejecutar, asegurate de que exista el directorio `./.worktrees`.
5. Ejecuta el comando con la ruta entre comillas para soportar nombres seguros en PowerShell:

```powershell
git worktree add "./.worktrees/<nombre-del-worktree>"
```

6. Al finalizar, informa el nombre elegido y la ruta creada.
