# KoriTV

KoriTV é um canal pseudo-live: a pessoa abre o link e entra na emissão no ponto certo, como se estivesse a ligar uma TV. O projeto tem:

- canal público em `index.html`;
- admin local em `admin.html`;
- programação por dia até à próxima semana;
- drag & drop para ordenar blocos;
- idents, separadores, publicidade, promos, programas e espaços vazios;
- ratings de idade: `A`, `7`, `12`, `15`, `19`;
- vídeo de aviso de idade antes de programas;
- ecrã off-air/off-screen;
- guardar localmente;
- publicar com `git add`, `git commit` e `git push` automático.

---

## 1. Instalar

Dentro da pasta do projeto:

```bash
npm install
```

Depois arrancar o admin local:

```bash
npm start
```

Ou:

```bash
node local-admin-server.js
```

Abre:

```txt
http://localhost:3000/admin.html
```

Canal público local:

```txt
http://localhost:3000/index.html
```

---

## 2. Enviar para GitHub

Cria primeiro um repositório no GitHub chamado `koritv`.

Depois, na pasta:

```bash
git init
git add .
git commit -m "Primeira versão KoriTV"
git branch -M main
git remote add origin https://github.com/TEU-USER/koritv.git
git push -u origin main
```

Se o remote já existir:

```bash
git remote set-url origin https://github.com/TEU-USER/koritv.git
git push -u origin main
```

---

## 3. Como funciona a emissão

A emissão é composta por blocos:

```txt
ident → aviso idade → programa → separador → publicidade → programa → off-air
```

O canal calcula a hora real e escolhe o bloco que deveria estar a dar naquele momento.

Exemplo:

```txt
17:00 Ident
17:00:08 Aviso A
17:00:13 Programa
17:39 Espaço vazio
18:00 Outro programa
```

Se alguém entrar às 17:20, entra no programa já a meio.

Se entrar às 17:45 e houver espaço vazio, aparece o ecrã off-air/espaço vazio.

---

## 4. Admin: programação por dia

No admin podes escolher o dia da programação.

A app limita a edição de hoje até aos próximos 7 dias para evitar grelhas demasiado antigas ou confusas.

Campos principais:

- **Dia**: data da programação.
- **Começa**: hora de início da emissão nesse dia.
- **Fecha**: hora de fecho.
- **Abrir/criar dia**: carrega ou cria a programação desse dia.
- **Começar agora**: define o início para a hora atual.

---

## 5. Adicionar programas

Na secção **Programar bloco**:

1. escolhe um asset da biblioteca;
2. escolhe como inserir:
   - `A seguir`;
   - `À hora`;
   - `Depois do bloco selecionado`;
3. escolhe rating: `A`, `7`, `12`, `15`, `19` ou usar o rating do asset;
4. escolhe se queres:
   - **ident antes**;
   - **aviso idade antes**;
5. clica **Adicionar à grelha**.

Quando o bloco é um programa, o admin pode inserir automaticamente:

```txt
Ident padrão → Aviso de idade → Programa
```

---

## 6. Espaços vazios e horários

Se adicionares um programa para as 18:00 mas a programação anterior acaba às 17:39, o admin cria automaticamente um bloco:

```txt
Espaço vazio até à hora escolhida
```

Depois podes:

- clicar **Puxar** nesse espaço vazio;
- clicar **Puxar tudo para cima** para remover todos os espaços vazios;
- inserir algo no meio desse espaço.

Isto é útil para construir a grelha como TV real.

---

## 7. Drag & drop

Na **Grelha do dia**, arrasta qualquer bloco para cima ou para baixo.

Também tens botões:

- `↑`;
- `↓`;
- `Duplicar`;
- `Preview`;
- `Remover`.

Clicar num bloco marca-o como selecionado. Depois podes usar **Depois do bloco selecionado** para inserir um novo bloco no meio.

---

## 8. Ratings de idade

Ratings disponíveis:

```txt
A  = todos os públicos
7  = maiores de 7
12 = maiores de 12
15 = maiores de 15
19 = maiores de 19
```

Antes de cada programa, o admin pode inserir automaticamente um vídeo de aviso de idade.

Podes configurar os URLs em:

```txt
Customização / vídeos fixos
```

Campos:

- Aviso A;
- Aviso 7;
- Aviso 12;
- Aviso 15;
- Aviso 19.

Esses vídeos devem ser curtos, tipo 5–7 segundos.

---

## 9. Customização

No admin podes configurar:

- logo do canal;
- imagem off-air/off-screen;
- mensagem off-air;
- ident padrão;
- separador padrão;
- vídeos de aviso de idade;
- biblioteca de programas, publicidade, idents, separadores e promos.

Tudo fica guardado em:

```txt
data/settings.json
data/library.json
data/schedule.json
```

---

## 10. Erros e avisos antes de publicar

O admin mostra erros/avisos como:

- bloco sem URL;
- duração inválida;
- programa sem rating;
- programa sem ident antes;
- programa sem aviso de idade antes;
- aviso de idade sem URL configurado;
- espaços vazios na grelha.

Erros bloqueiam publicação.

Avisos perguntam se queres publicar mesmo assim.

---

## 11. Guardar vs Publicar

### Guardar local

Só grava os JSONs no teu computador.

### Publicar + Commit

Faz automaticamente:

```bash
git add data/schedule.json data/library.json data/settings.json
git commit -m "Atualizar programação KoriTV"
git push
```

É como fazer commit no VS Code, mas pelo admin.

---

## 12. Onde pôr vídeos grandes

Não metas vídeos grandes dentro do repo.

Usa GitHub Releases ou outro alojamento.

No repo ficam só:

- código;
- JSONs;
- SVGs/logos leves;
- posters pequenos.

Nos assets da biblioteca, usa links tipo:

```txt
https://github.com/teu-user/koritv/releases/download/videos/programa-001.mp4
```

---

## 13. Estrutura

```txt
koritv/
├── index.html
├── admin.html
├── local-admin-server.js
├── package.json
├── README.md
├── data/
│   ├── schedule.json
│   ├── library.json
│   └── settings.json
├── assets/
│   ├── logos/
│   ├── offair/
│   └── posters/
└── src/
    ├── admin.js
    ├── player.js
    └── styles.css
```

---

## 14. Comandos úteis

Ver remote:

```bash
git remote -v
```

Trocar remote:

```bash
git remote set-url origin https://github.com/TEU-USER/koritv.git
```

Ver estado:

```bash
git status
```

Commit manual, se precisares:

```bash
git add .
git commit -m "Atualizar KoriTV"
git push
```

---

## Nota importante

O admin local consegue alterar ficheiros e fazer commit porque está a correr com Node.js no teu computador.

Um `index.html` sozinho no browser não consegue fazer isso por segurança.
