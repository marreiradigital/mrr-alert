# MrrAlert

Biblioteca **Vanilla JS + CSS** (sem dependências) para **modals** e **toasts**, inspirada na ergonomia do SweetAlert2, porém pensada para ser **leve**, **rápida** e fácil de manter.

- 1 modal ativo por vez (se abrir outro, o anterior é encerrado como `dismiss: "replaced"`)
- Suporte a: alert básico, sucesso, erro, warning, info, pergunta, confirmação, loading/aguarde, HTML custom
- Toasts: sucesso, erro, info, warning, loading, autoclose com progress bar
- Acessibilidade: `role`, `aria-live`, foco no botão, trap de TAB no modal, ESC opcional

---

## Instalação

### Opção A) Arquivos locais
1. Adicione o CSS no `<head>`:
```html
<link rel="stylesheet" href="/assets/mrr-alert/mrr-alert.css">
````

2. Adicione o JS antes de fechar o `</body>`:

```html
<script src="/assets/mrr-alert/mrr-alert.js"></script>
```

### Opção B) CDN (opcional)

Se você publicar no GitHub Releases / npm / jsDelivr, substitua pelos seus links.

---

## Quick Start

```js
// Modal básico
MrrAlert.basic({ title: 'Olá', text: 'Mensagem básica.' });

// Toast de sucesso
MrrAlert.toastSuccess({ title: 'Sucesso', text: 'Salvo com sucesso.' });
```

---

## API

### MrrAlert.fire(options)

Abre um **modal** (por padrão).

Retorna uma `Promise` com o resultado do fechamento.

Exemplo:

```js
const result = await MrrAlert.fire({
  icon: 'info',
  title: 'Atenção',
  text: 'Você quer continuar?',
  showCancelButton: true,
  confirmButtonText: 'Continuar',
  cancelButtonText: 'Cancelar'
});

if (result.isConfirmed) {
  // confirmado
} else {
  // dismiss (esc, backdrop, cancel, close, timer, api, replaced)
}
```

### MrrAlert.toast(options)

Exibe um **toast** (sempre retorna `Promise` ao fechar).

```js
await MrrAlert.toast({
  icon: 'success',
  title: 'Sucesso',
  text: 'Atualizado.',
  timer: 2500,
  timerProgressBar: true
});
```

### MrrAlert.close()

Fecha o modal atual (se existir), com `dismiss: "api"`.

```js
MrrAlert.close();
```

### MrrAlert.isOpen()

Retorna `true` se há modal ativo.

```js
if (MrrAlert.isOpen()) console.log('tem modal aberto');
```

### MrrAlert.setDefaults(defaults)

Define defaults globais.

```js
MrrAlert.setDefaults({
  confirmButtonText: 'Ok',
  cancelButtonText: 'Cancelar',
  allowEscapeKey: true,
  timerProgressBar: true
});
```

---

## Helpers (atalhos)

Esses métodos são “açúcar sintático” em cima de `fire()` / `toast()`:

### Modals

* `MrrAlert.basic(options)`
* `MrrAlert.success(options)`
* `MrrAlert.error(options)`
* `MrrAlert.info(options)`
* `MrrAlert.warning(options)`
* `MrrAlert.html(options)` (usa `html`)
* `MrrAlert.question(options)` (já vem com cancel/confirm)
* `MrrAlert.confirm(options)` (confirmação com cancel)
* `MrrAlert.loading(options)` (bloqueia ESC/backdrop por padrão)
* `MrrAlert.autoClose(options)` (timer + progress por padrão)

### Toasts

* `MrrAlert.toastSuccess(options)`
* `MrrAlert.toastError(options)`
* `MrrAlert.toastInfo(options)`
* `MrrAlert.toastWarning(options)`
* `MrrAlert.toastLoading(options)` (sem timer por padrão)

---

## Options (referência)

### Opções principais (modal e toast)

| Opção             | Tipo     | Default     | Descrição                                    |       |         |      |          |         |          |
| ----------------- | -------- | ----------- | -------------------------------------------- | ----- | ------- | ---- | -------- | ------- | -------- |
| `title`           | string   | `''`        | Título principal                             |       |         |      |          |         |          |
| `text`            | string   | `''`        | Texto simples                                |       |         |      |          |         |          |
| `html`            | string   | `''`        | Conteúdo HTML custom (cuidado com XSS)       |       |         |      |          |         |          |
| `icon`            | string   | `'neutral'` | `success                                     | error | warning | info | question | loading | neutral` |
| `showCloseButton` | boolean  | `true`      | Exibe botão X                                |       |         |      |          |         |          |
| `toast`           | boolean  | `false`     | Se `true`, renderiza toast ao invés de modal |       |         |      |          |         |          |
| `didOpen`         | function | `null`      | Callback após abrir (recebe elemento)        |       |         |      |          |         |          |
| `willClose`       | function | `null`      | Callback antes de fechar                     |       |         |      |          |         |          |

### Modal: comportamento

| Opção                | Tipo    | Default      | Descrição                                    |
| -------------------- | ------- | ------------ | -------------------------------------------- |
| `showCancelButton`   | boolean | `false`      | Exibe botão cancelar                         |
| `showConfirmButton`  | boolean | `true`       | Exibe botão confirmar                        |
| `confirmButtonText`  | string  | `'OK'`       | Texto do confirmar                           |
| `cancelButtonText`   | string  | `'Cancelar'` | Texto do cancelar                            |
| `confirmButtonColor` | string  | `''`         | Cor do confirmar (se vazio, herda do `icon`) |
| `allowOutsideClick`  | boolean | `true`       | Clique no backdrop fecha                     |
| `allowEscapeKey`     | boolean | `true`       | ESC fecha                                    |
| `focusConfirm`       | boolean | `true`       | Foca o botão confirmar ao abrir              |

### Timer / autoclose (modal e toast)

| Opção              | Tipo        | Default | Descrição                     |
| ------------------ | ----------- | ------- | ----------------------------- |
| `timer`            | number (ms) | `0`     | Se > 0, fecha automaticamente |
| `timerProgressBar` | boolean     | `false` | Mostra barra de progresso     |

### Toast: posição

| Opção      | Tipo   | Default       | Descrição  |          |              |              |
| ---------- | ------ | ------------- | ---------- | -------- | ------------ | ------------ |
| `position` | string | `'top-right'` | `top-right | top-left | bottom-right | bottom-left` |

---

## Result (retorno)

O retorno de `fire()` e `toast()` é um objeto com flags:

### Confirmado

```js
{ isConfirmed: true, value: true }
```

### Fechado / dismiss

```js
{ isDismissed: true, dismiss: 'esc' }
```

Valores possíveis de `dismiss`:

* `close` (botão X)
* `cancel` (botão cancelar)
* `backdrop` (clique fora)
* `esc` (ESC)
* `timer` (autoclose)
* `api` (MrrAlert.close())
* `replaced` (um novo modal substituiu o atual)

---

## Exemplos

### 1) Alert básico

```js
MrrAlert.basic({
  title: 'Aviso',
  text: 'Mensagem simples.'
});
```

### 2) Sucesso / Erro

```js
MrrAlert.success({ title: 'Sucesso', text: 'Operação concluída.' });
MrrAlert.error({ title: 'Falha', text: 'Não foi possível concluir.' });
```

### 3) Confirmação (com cancel)

```js
const r = await MrrAlert.confirm({
  title: 'Excluir anúncio',
  text: 'Esta ação é permanente.',
  confirmButtonText: 'Confirmar Exclusão',
  confirmButtonColor: 'var(--mrr_alert_error)'
});

if (r.isConfirmed) {
  // execute exclusão
}
```

### 4) Pergunta (Sim/Não)

```js
const r = await MrrAlert.question({
  title: 'Sair da conta',
  text: 'Tem certeza que deseja sair?',
  confirmButtonText: 'Logout',
  cancelButtonText: 'Ficar',
  confirmButtonColor: 'var(--mrr_alert_error)'
});

if (r.isConfirmed) {
  // logout
}
```

### 5) Loading / Aguarde

```js
MrrAlert.loading({ title: 'Aguarde', text: 'Processando...' });

// ... finalize seu processo
MrrAlert.close();
```

### 6) Autoclose + progress

```js
MrrAlert.autoClose({
  icon: 'success',
  title: 'Sucesso!',
  text: 'Fechando automaticamente...',
  timer: 2200,
  timerProgressBar: true
});
```

### 7) HTML custom (layout livre)

```js
MrrAlert.html({
  title: 'Verify Advertisement',
  html: `
    <div style="text-align:left">
      <div style="font-weight:700;margin-bottom:.6rem">Verification Process</div>
      <div style="color:#6b7280">
        Ao verificar, ficará público imediatamente. Garanta que as fotos estejam ok.
      </div>

      <div style="margin-top:1.2rem;padding:1.2rem;border:1px solid rgba(17,24,39,.10);border-radius:1rem">
        <div style="font-weight:700">Ana Silva</div>
        <div style="color:#6b7280">ID: #84920</div>
      </div>
    </div>
  `,
  confirmButtonText: 'VERIFICAR ANÚNCIO',
  confirmButtonColor: 'var(--mrr_alert_success)',
  showCancelButton: true,
  cancelButtonText: 'Cancelar'
});
```

---

## Toasts

### Toast de sucesso (autoclose)

```js
MrrAlert.toastSuccess({
  title: 'Operação Concluída',
  text: 'As alterações foram salvas.',
  timer: 2500
});
```

### Toast de erro

```js
MrrAlert.toastError({
  title: 'Falha na verificação',
  text: 'O arquivo não atende os requisitos mínimos.'
});
```

### Toast de loading (sem timer)

```js
MrrAlert.toastLoading({
  title: 'Aguarde',
  text: 'Enviando...'
});

// depois, você pode fechar programaticamente removendo o toast via timer,
// ou (em versões futuras) usando id/handle.
```

---

## Customização de tema (CSS Variables)

A biblioteca usa variáveis CSS. Você pode sobrescrever no seu tema:

```css
:root{
  --mrr_alert_radius: 1.6rem;
  --mrr_alert_shadow: 0 12px 34px rgba(17,24,39,.12);
  --mrr_alert_success: #12b76a;
  --mrr_alert_error: #f04438;
  --mrr_alert_warning: #f79009;
  --mrr_alert_info: #2e90fa;
}
```

---

## Acessibilidade (notas)

* Modal usa `role="dialog"` + `aria-modal="true"`
* Toast usa `role="status"` ou `role="alert"` dependendo do tipo
* `TAB` fica preso dentro do modal (focus trap)
* ESC e clique no backdrop podem ser desabilitados

---

## Roadmap (opcional)

* `update()` para alterar conteúdo sem fechar
* Handle/ID para toasts (fechar especificamente)
* `denyButton` (3º botão)
* Queue (sequência de modals)
* Temas prontos (light/dark)

---

## Licença

Defina a licença no GitHub (ex: MIT). A biblioteca foi construída para permitir uso e modificação livre.

---

## Contribuição

* Issues e PRs são bem-vindos.
* Mantenha o padrão: Vanilla JS, sem dependências.

```
