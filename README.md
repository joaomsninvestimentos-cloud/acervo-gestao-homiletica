# 📱 Acervo & Gestão Homilética

> **Plataforma Mobile (PWA & Android/Capacitor) para gerenciamento do ciclo de vida de esboços de pregação, estudos bíblicos expositivos e conexão com louvores âncora.**

---

## 🎯 1. Visão Geral e Identidade do Projeto

O **Acervo & Gestão Homilética** foi projetado com um tom teológico **profundo, acessível, prático e pastoral**, unindo organização ministerial e recursos práticos de púlpito:

* **Foco Bíblico Multiversão:** Textos bíblicos estruturados na **NVT (Nova Versão Transformadora)** com alternância instantânea e quadro comparativo lado a lado com **NVI**, **NTLH** e **A Mensagem**.
* **Conexão Homilética & Adoração (*Louvor Âncora*):** Cada sermão vincula sua proposição central e apelo a um louvor temático (com trecho da letra, link/player do YouTube e tom musical).
* **Sintetizador de Fundo Musical (*Worship Pad*) Integrado:** Gerador de pad contínuo de oração via *Web Audio API* nos tons **C, D, E, F, G e A**, funcionando **100% offline** diretamente do celular para momentos de oração, leitura da Palavra e apelo.
* **Modo Púlpito em Tela Cheia:** Interface noturna de alto contraste com **cronômetro de pregação**, ajuste dinâmico de fonte (`A-` / `A+`) e *checklist* interativo de tópicos.

---

## 🗂️ 2. Estrutura de Dados e Módulos (61 Passagens Pré-Carregadas)

O aplicativo já vem populado com **61 passagens bíblicas** organizadas em **3 listas dinâmicas** (também visualizáveis em **Quadro Kanban de 3 Colunas**):

| Módulo / Lista | Qtd. Inicial | Descrição e Conteúdo |
| :--- | :---: | :--- |
| **1. Exposição Pregada** *(Histórico / Concluídos)* | **6** | Mensagens já ministradas (*Lamentações 3:21-24*, *Tiago 1:2-8*, *Romanos 8:31-39*, *Filipenses 4:6-7*, *Isaías 40:28-31*, *Josué 1:1-9*) com registro de data, local, esboço expositivo completo e louvor âncora. |
| **2. Esboço Pronto** *(Pronto para Pregar)* | **6** | Sermões completos prontos para o púlpito (*Êxodo 13:17-18 / Rm 8:28 – "Deserto"*, *Lucas 8:22-25 – "Escape"*, *Salmos 34:1-19*, *Hebreus 4:12-16*, *Gênesis 22:1-14*, *2 Crônicas 20:1-22*) com Introdução, Tópicos I–III, Aplicações Práticas e Apelo. |
| **3. Em Acervo** *(Fila de Trabalho / Banco de Ideias)* | **49** | Passagens catalogadas por livro, tema, palavras-chave, referências cruzadas e louvor sugerido, prontas para desenvolvimento ou promoção imediata para *Esboço Pronto*. |

---

## ⚙️ 3. Funcionalidades Principais

1. **Ficha Homilética Completa:**
   * **Cabeçalho:** Título, Proposição Central, Status e Data/Local de Ministração.
   * **Fundamentação Bíblica:** Seletor rápido (`NVT`, `NVI`, `NTLH`, `A Mensagem`) + modo **Comparar as 4 Versões** + *Textos de Apoio* (referências cruzadas).
   * **Desenvolvimento Homilético:** Introdução contextual, **Tópicos Expositivos I, II e III** com **Aplicação Pastoral Prática**, Conclusão e Direcionamento para o Apelo.
   * **Louvor Âncora:** Canção, artista, trecho da letra, player integrado do YouTube e disparador do *Fundo Musical de Oração* no tom da música.
2. **Transição Dinâmica de Status (1 Toque):**
   * Promova qualquer passagem de **Em Acervo ➔ Esboço Pronto ➔ Exposição Pregada** (com registro automático de data e igreja/evento).
3. **Busca Inteligente e Filtros por Tags Temáticas:**
   * Pesquisa instantânea por livro bíblico, versículo, título, cantor ou palavra-chave.
   * Chips de filtro por tema: *Restauração*, *Deserto & Provação*, *Soberania*, *Oração*, *Sabedoria*, *Fé & Provisão*, *Graça & Salvação* e *Adoração & Louvor*.
4. **Criação, Edição, Impressão PDF e Backup JSON:**
   * Crie novos esboços, edite qualquer uma das 61 fichas, imprima a folha de púlpito em PDF ou exporte backup em `.json`.

---

## 🚀 4. Como Executar e Publicar no GitHub (PWA + APK Android)

### Opção A — Uso Imediato como Web App / PWA (GitHub Pages)
1. Suba os arquivos deste repositório para um novo repositório no seu GitHub (ex.: `acervo-gestao-homiletica`).
2. No GitHub, acesse **Settings ➔ Pages** e selecione a branch `main` (pasta `/root`).
3. Abra o link gerado no navegador do celular (Android ou iPhone) e toque em **"Adicionar à tela inicial"** (*Add to Home Screen*) para instalá-lo como aplicativo com suporte offline via *Service Worker*.

### Opção B — APK Android (Poco / Xiaomi / Chrome)
O Chrome no MIUI (Poco X4 Pro 5G) costuma **cortar o download** da aba Releases do GitHub. Use a pagina direta:

1. Abra no celular: https://joaomsninvestimentos-cloud.github.io/acervo-gestao-homiletica/download.html
2. Toque em **Baixar e instalar** e espere 100% (barra de progresso).
3. Permita **Instalar apps desconhecidos** para o Chrome, se o Android pedir.
4. Se a v1.0.0 (debug) estiver instalada, **desinstale antes**. A v1.1+ usa a mesma chave.

A partir da v1.2.0 o APK tambem fica em `apk/AcervoHomiletico.apk` no GitHub Pages (sem redirect). O app avisa no celular quando houver versao nova.

### Opcao D — Atualizacao automatica (Vercel)
O APK no celular consulta `version.json` no GitHub Pages e, se existir, na Vercel (`acervo-gestao-homiletica.vercel.app`). Quando a versao for maior, aparece o banner **Atualizar**.

Para ligar o canal Vercel: no repositorio, rode o workflow **Deploy Vercel (opcional)** depois de gravar os secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`. Sem esses secrets o app continua atualizando pelo GitHub Pages.

### Opção C — Rodar Localmente no Computador
```bash
# Servir imediatamente com Python ou Node:
python3 -m http.server 8080
# ou
npm start
```

---

## 📁 Estrutura de Arquivos

```text
acervo-gestao-homiletica/
├── index.html                              # Interface principal Mobile/PWA + Modais + Modo Púlpito
├── styles.css                              # Design System Pastoral (Claro/Escuro, Kanban, Impressão)
├── app.js                                  # Lógica de estado, filtros, Modo Púlpito e Synth Worship Pad
├── updater.js                              # Checagem OTA (GitHub Pages + Releases)
├── download.html                           # Pagina de download direto do APK (MIUI)
├── manifest.json                           # Manifesto PWA instalável no celular
├── sw.js                                   # Service Worker para funcionamento 100% offline
├── package.json                            # Scripts NPM e dependências Capacitor Android
├── capacitor.config.json                   # Configuração nativa Android (br.com.acervohomiletico.app)
├── data/
│   └── acervo-61.js                        # Base completa com as 61 passagens (6 + 6 + 49)
├── icons/
│   └── icon.svg                            # Ícone vetorial oficial (Bíblia Aberta + Cruz Dourada)
└── .github/
    └── workflows/
        └── build-android-apk.yml           # Pipeline GitHub Actions para compilar o APK Android
```
