# Documentação da Estação - Desafio das Emoções

## 📋 Informações Gerais

### Nome da Estação
**Desafio das Emoções com IA**

### Nome Alternativo
**Estação de Inteligência Artificial e Visão Computacional**

---

## 📝 Descrição da Atividade

O **Desafio das Emoções** é uma atividade interativa que combina Inteligência Artificial, Visão Computacional e reconhecimento facial para ensinar aos alunos conceitos fundamentais de Engenharia Informática de forma prática e divertida.

### Como Funciona

Os alunos participam num jogo dividido em **rondas** que inclui:

1. **Desafios de Emoções**
   - Os alunos devem expressar emoções faciais específicas
   - A IA deteta e analisa as expressões em tempo real
   - Sistema analisa 68 pontos de referência no rosto
   - Emoções incluem: feliz, triste, zangado, surpreso, neutro, com medo, enojado

2. **Perguntas sobre Visão Computacional**
   - Como a IA "vê" e processa imagens
   - Deteção de faces e pontos faciais
   - Conceitos de Machine Learning

3. **Aplicações Reais de IA**
   - Reconhecimento facial em telemóveis
   - Filtros de redes sociais (Instagram, Snapchat)
   - Carros autónomos e deteção de obstáculos

4. **Desafios de Programação**
   - Lógica de programação básica
   - Algoritmos de deteção de emoções
   - Debugging e resolução de problemas

5. **Desafios Criativos e Gestos**
   - Deteção de gestos das mãos (👍, ❤️, 👌)
   - Associação de cores e emoções
   - Áreas de estudo em Engenharia Informática

### Objetivos Educacionais

- Introduzir conceitos de **Inteligência Artificial** de forma acessível
- Demonstrar aplicações práticas de **Visão Computacional**
- Ensinar fundamentos de **Machine Learning**
- Promover interesse em **Engenharia Informática**
- Desenvolver pensamento lógico e algorítmico
- Mostrar a ligação entre tecnologia e o mundo real

### Duração

- **Por aluno/grupo**: 15 minutos
- **Capacidade**: 1 aluno em simultâneo (por estação)

### Público-Alvo

- Alunos do ensino básico e secundário
- Faixa etária recomendada: 12-18 anos
- Não requer conhecimentos prévios de programação

---

## 💻 Material Necessário

### Hardware

#### Computador
- **Processador**: Intel i5 / AMD Ryzen 5 ou superior
- **RAM**: Mínimo 8GB (recomendado 16GB)
- **Webcam**:
  - Câmara integrada no portátil OU
  - Webcam externa USB (mínimo 720p)
  - Recomendado: 1080p para melhor deteção
- **Sistema Operativo**:
  - Windows 10/11
  - macOS 10.15 ou superior
  - Linux (Ubuntu 20.04+)

#### Periféricos
- **Rato** (opcional, mas recomendado)
- **Teclado** funcional

#### Ecrã
- Monitor ou portátil com resolução mínima 1366x768
- Recomendado: 1920x1080 (Full HD)

### Software

#### Obrigatório
- **Node.js** versão 16 ou superior (gratuito)
  - Download: https://nodejs.org/
- **Browser moderno** (um dos seguintes):
  - Google Chrome (recomendado)
  - Microsoft Edge
  - Firefox
  - Safari

#### Incluído no Projeto
- Express.js (servidor backend)
- face-api.js (biblioteca de deteção facial)
- Modelos de IA pré-treinados

### Conectividade

- **Internet**: Não obrigatório após instalação inicial
- **Rede Local**: Não necessária
- Funciona **offline** após setup

### Espaço em Disco

- **Espaço necessário**: ~200MB
  - Código-fonte: ~5MB
  - Node.js dependencies: ~50MB
  - Modelos de IA: ~30MB
  - Espaço para resultados: ~10MB

### Condições Ambientais

#### Iluminação
- **Essencial**: Boa iluminação frontal nos rostos
- Evitar luz forte por trás (contra-luz)
- Iluminação natural ou artificial adequada
- A deteção facial pode falhar com luz muito fraca

#### Espaço Físico
- Mesa com espaço para computador
- Cadeiras para cada participante
- Distância câmara-rosto: 40-80cm (ideal)

#### Ruído
- Atividade **silenciosa** (não usa áudio)
- Pode funcionar em ambiente com ruído moderado

---

## 📊 Dados e Resultados

### Sistema de Pontuação

- **Escala**: 0 a 5
- Pontuação baseada em:
  - Correção das respostas
  - Velocidade de conclusão
  - Precisão na deteção de emoções

### Armazenamento de Resultados

- **Formato**: CSV (Excel compatível)
- **Dados guardados**:
  - Nome do aluno
  - Apelido
  - Escola
  - Pontuação final (0-5)
  - Data e hora de conclusão
- **Localização**: Ficheiro local no computador
- **RGPD**: Conformidade garantida (dados não saem do computador)

### Exportação

- Ficheiro CSV pode ser exportado a qualquer momento
- Formato compatível com Excel, Google Sheets
- Fácil análise estatística posterior

---

## 👥 Recursos Humanos

### Por Estação

- **1 monitor/facilitador** recomendado
- Funções:
  - Explicar a atividade inicial
  - Auxiliar com dúvidas técnicas
  - Garantir fluxo de participantes
  - Resolver problemas técnicos básicos

### Formação Necessária

- **Conhecimento técnico**: Básico
- **Formação prévia**: 15-30 minutos
- **Manual incluído**: Sim (README.md)

---

## 🔧 Setup e Preparação

### Instalação Inicial (Primeira vez)

1. Copiar pasta do projeto para o computador
2. Instalar Node.js
3. Executar `npm install` (automático nos scripts)
4. Testar funcionamento

**Tempo de setup**: 15-20 minutos

### Preparação Diária

1. Executar script de arranque:
   - Windows: duplo clique em `start-server.bat`
   - Mac/Linux: executar `./start-server.sh`
2. Aguardar mensagem "Server Running"
3. Abrir browser em `http://localhost:3000`
4. Verificar câmara funciona

**Tempo de preparação**: 2-3 minutos

### Manutenção Durante o Evento

- **Mínima**: Sistema corre automaticamente
- **Reiniciar servidor**: Apenas se necessário (raro)
- **Limpar cache browser**: Se houver problemas visuais

---

## 🎯 Diferenciais da Atividade

### Tecnológico
- Uso de **IA real** (não simulação)
- Tecnologia **state-of-the-art** (face-api.js)
- Deteção em **tempo real**

### Pedagógico
- **Hands-on**: Aprendizagem prática
- **Imediato**: Feedback instantâneo
- **Progressivo**: Dificuldade crescente
- **Contextualizado**: Exemplos do dia-a-dia

### Envolvimento
- **Interativo**: Usa expressões e gestos
- **Gamificado**: Sistema de pontos
- **Divertido**: Desafio de fazer caretas
- **Competitivo**: Pode comparar pontuações

### Institucional
- Promove imagem da **UFP**
- Demonstra qualidade do ensino
- Atrai potenciais alunos
- Recolhe dados para análise

---

## 📞 Contacto e Suporte

### Durante Preparação
- Testar com antecedência (1 semana antes)
- Verificar compatibilidade de hardware
- Fazer backup dos ficheiros

### Durante o Evento
- Ter telefone/contacto de suporte técnico
- Manual impresso disponível
- Script de troubleshooting básico

### Problemas Comuns

| Problema | Solução |
|----------|---------|
| Câmara não funciona | Verificar permissões do browser |
| Servidor não inicia | Verificar se Node.js está instalado |
| IA não deteta rosto | Melhorar iluminação |
| Página não carrega | Reiniciar browser |

---

## 📈 Capacidade e Fluxo

### Estimativas

- **Tempo por aluno**: 15 min
- **Alunos/hora**: 4 (por estação)
- **Alunos/dia** (6h): 24

### Recomendações de Fluxo

1. Grupo de espera (2-3 alunos)
2. Aluno a jogar (1-2 simultâneos)
3. Saída e registo de pontuação
4. Próximo aluno entra

### Múltiplas Estações

Se necessário maior capacidade:
- **2 estações** = dobro de capacidade
- Requer 2 computadores independentes
- Cada um gera seu próprio CSV

---

## ✅ Checklist Final

### Antes do Evento

- [ ] Node.js instalado e testado
- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor testado e funcional
- [ ] Câmara testada e com permissões
- [ ] Iluminação adequada verificada
- [ ] Browser atualizado
- [ ] Scripts de arranque testados
- [ ] Monitor/facilitador formado
- [ ] Material impresso preparado

### Dia do Evento

- [ ] Computador ligado
- [ ] Servidor iniciado
- [ ] Browser aberto na página correta
- [ ] Câmara funcionando
- [ ] Teste rápido (1 ronda)
- [ ] Backup dos ficheiros existentes
- [ ] Contacto de suporte disponível

### Fim do Evento

- [ ] Exportar CSV de resultados
- [ ] Fazer backup dos dados
- [ ] Encerrar servidor (Ctrl+C)
- [ ] Fechar aplicações
- [ ] Guardar ficheiros em segurança

---

## 🎓 Sobre a UFP

Esta atividade foi desenvolvida para demonstrar as capacidades e a qualidade do ensino em **Engenharia Informática** na **Universidade Fernando Pessoa**.

### Áreas Destacadas
- Inteligência Artificial
- Visão Computacional
- Machine Learning
- Desenvolvimento Full Stack
- Programação JavaScript/Node.js

### Mais Informações
- Website: https://www.ufp.pt
- Curso: Engenharia Informática
- Contacto: [inserir contacto do departamento]

---

**Versão**: 1.0
**Data**: Outubro 2025
**Desenvolvido por**: UFP - Universidade Fernando Pessoa
