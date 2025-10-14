# Desafio das Emoções

Um jogo interativo que desafia estudantes (15+ anos) a reproduzir emoções faciais usando deteção facial e reconhecimento de emoções em tempo real.

## Características

- Deteção de emoções faciais em tempo real usando face-api.js
- 7 rondas de desafios emocionais (feliz, triste, zangado, surpreso, neutro, com medo, enojado)
- Sistema de pontuação numa escala de 0 a 5
- Armazenamento local de resultados para múltiplos estudantes
- Exportação CSV para análise de dados no final do dia
- Funciona completamente offline (sem necessidade de internet após configuração)
- Interface bonita e responsiva desenhada para adolescentes
- Previne emoções consecutivas duplicadas

## Requisitos

- Navegador web moderno (Chrome, Firefox ou Edge recomendados)
- Acesso à webcam
- Sem necessidade de ligação à internet (todos os ficheiros são locais)

## Estrutura do Projeto

```
SantoTirsoChallenge/
├── index.html              # Ficheiro HTML principal
├── app.js                  # Lógica do jogo e deteção facial
├── style.css               # Estilos
├── lib/
│   └── face-api.min.js    # Biblioteca de deteção facial
├── models/                 # Modelos de IA para deteção de emoções
│   ├── tiny_face_detector_model-weights_manifest.json
│   ├── tiny_face_detector_model.bin
│   ├── face_expression_model-weights_manifest.json
│   └── face_expression_model.bin
├── LEIAME.md              # Este ficheiro
└── README.md              # Versão em inglês
```

## Como Usar

### Executar o Jogo

1. Abrir `index.html` num navegador web (duplo clique no ficheiro)
2. Permitir acesso à câmara quando solicitado pelo navegador
3. Os estudantes inserem a informação:
   - Primeiro Nome
   - Último Nome
   - Nome da Escola
4. Clicar em "Começar Jogo"
5. Aguardar que os modelos carreguem (primeira vez pode demorar alguns segundos)
6. Seguir as instruções no ecrã para reproduzir cada emoção
7. Completar todas as 7 rondas
8. Ver resultados (guardados automaticamente)

### Instruções do Jogo para Estudantes

- Cada ronda mostrará uma emoção para reproduzires
- Posiciona o teu rosto em frente à câmara
- Faz a expressão facial da emoção pedida
- Mantém a expressão durante 2 segundos para ganhar pontos
- Tens 10 segundos por ronda
- Respostas corretas mais rápidas = mais pontos

### Sistema de Pontuação

- **Total de Rondas**: 7
- **Pontuação Final**: 0.0 a 5.0
- Os pontos são atribuídos com base em:
  - Reproduzir com sucesso a emoção correta
  - Velocidade de resposta (mais rápido = mais pontos)

Interpretação da Pontuação:
- **4.5 - 5.0**: Excelente - Mestre das Emoções
- **3.5 - 4.4**: Muito bom - Excelente expressão emocional
- **2.5 - 3.4**: Bom trabalho - Continua a praticar
- **1.5 - 2.4**: Nada mal - Tenta mostrar as emoções mais claramente
- **0.0 - 1.4**: Continua a praticar - Vais melhorar

## Armazenamento de Resultados e Recolha de Dados

### Armazenamento Local

Todos os resultados são guardados **localmente** no navegador de cada computador usando `localStorage`. Isto significa:
- Múltiplos estudantes podem jogar sequencialmente no mesmo computador
- Todos os dados ficam guardados localmente
- Não há necessidade de internet
- Os dados persistem mesmo que o navegador seja fechado

### Exportação CSV

No **final do dia** (ou quando quiseres exportar os dados):

1. Volta ao ecrã inicial da aplicação
2. Clica no botão verde **"Exportar Dados CSV"**
3. Um ficheiro CSV será descarregado com todos os resultados: `resultados_emocoes_[DATA].csv`

### Formato CSV

```csv
FirstName,LastName,School,Score,Timestamp
João,Silva,Escola Secundária Santo Tirso,4.25,2025-10-14T15:30:45.123Z
Maria,Costa,Escola Secundária Santo Tirso,3.80,2025-10-14T15:35:12.456Z
```

### Fundir Múltiplos Ficheiros CSV

Como o jogo corre em vários computadores, terás múltiplos ficheiros CSV para fundir:

#### Opção 1: Fusão Manual
1. Abrir todos os ficheiros CSV
2. Copiar todas as linhas de dados (ignorar linhas de cabeçalho após o primeiro ficheiro)
3. Colar num único ficheiro CSV principal

#### Opção 2: Usar Linha de Comandos (macOS/Linux)
```bash
cat resultados_emocoes_*.csv | head -1 > resultados_final.csv
tail -n +2 -q resultados_emocoes_*.csv >> resultados_final.csv
```

#### Opção 3: Usar Linha de Comandos (Windows)
```cmd
copy resultados_emocoes_*.csv resultados_final.csv
```

Depois remover manualmente as linhas de cabeçalho duplicadas.

## Detalhes Técnicos

### Tecnologias Utilizadas

- **HTML5**: Estrutura e elemento de vídeo
- **CSS3**: Estilos e animações
- **JavaScript (ES6+)**: Lógica do jogo
- **face-api.js**: Deteção facial e reconhecimento de emoções
- **WebRTC**: Acesso à câmara via API getUserMedia

### Emoções Suportadas

O jogo usa face-api.js que pode detetar 7 emoções:
1. Feliz (Happy)
2. Triste (Sad)
3. Zangado (Angry)
4. Surpreso (Surprised)
5. Neutro (Neutral)
6. Com Medo (Fearful)
7. Enojado (Disgusted)

**Nota**: O jogo **nunca repete a mesma emoção em rondas consecutivas** para tornar o desafio mais interessante.

### Compatibilidade de Navegadores

| Navegador | Versão | Estado |
|-----------|--------|--------|
| Chrome    | 70+    | ✅ Totalmente Suportado |
| Firefox   | 65+    | ✅ Totalmente Suportado |
| Edge      | 79+    | ✅ Totalmente Suportado |
| Safari    | 14+    | ⚠️ Pode requerer HTTPS |

## Resolução de Problemas

### Câmara Não Funciona

1. **Verificar permissões**: Certifica-te que o navegador tem permissão para aceder à câmara
2. **Verificar outras aplicações**: Fecha outras aplicações que possam estar a usar a câmara
3. **Reiniciar navegador**: Às vezes um simples reinício ajuda
4. **Tentar outro navegador**: Muda para Chrome ou Firefox se os problemas persistirem

### Modelos Não Carregam

1. **Verificar estrutura de ficheiros**: Certifica-te que todos os ficheiros estão nos diretórios corretos
2. **Usar servidor local**: Alguns navegadores requerem um servidor local para carregar ficheiros locais
   ```bash
   # Usando Python 3
   python -m http.server 8000

   # Depois abrir http://localhost:8000 no navegador
   ```

### Baixa Precisão de Deteção

1. **Boa iluminação**: Certifica-te que o rosto do estudante está bem iluminado
2. **Posição do rosto**: Mantém o rosto centrado na vista da câmara
3. **Exagerar expressões**: Faz expressões faciais claras e exageradas
4. **Remover obstruções**: Sem óculos, máscaras ou mãos a cobrir o rosto

### Dados Não Exportam

1. **Verificar configurações do navegador**: Alguns navegadores bloqueiam descargas automáticas
2. **Verificar bloqueador de pop-ups**: Desativa o bloqueador de pop-ups para esta página
3. **Armazenamento local**: Os dados estão guardados no localStorage do navegador

## Privacidade e Dados

- **Nenhum dado enviado online**: Todo o processamento acontece localmente no dispositivo
- **Nenhuma imagem facial guardada**: Apenas as pontuações de deteção de emoções são guardadas
- **Armazenamento apenas local**: Os dados são guardados localmente em formato CSV
- **Compatível com RGPD**: Nenhum dado pessoal é transmitido ou armazenado online

## Configuração para Múltiplos Computadores

### Instruções de Implementação

1. Copiar a pasta completa `SantoTirsoChallenge` para cada computador
2. Certificar que todos os ficheiros mantêm a estrutura de diretórios
3. Testar em cada computador antes do evento
4. Recolher ficheiros CSV de cada computador após o evento (usando o botão "Exportar Dados CSV")
5. Fundir todos os ficheiros CSV para análise final

### Melhores Práticas

- Testar a funcionalidade da câmara em cada computador previamente
- Garantir boa iluminação na sala
- Ter um computador de backup pronto
- Exportar os ficheiros CSV imediatamente após cada sessão
- Manter os ficheiros CSV originais como backup antes de fundir

## Fluxo de Trabalho Recomendado

### Durante o Dia
1. Abrir `index.html` em cada computador
2. Os estudantes jogam sequencialmente
3. Todos os resultados são guardados automaticamente em localStorage

### Fim do Dia
1. Em cada computador, voltar ao ecrã inicial
2. Clicar em **"Exportar Dados CSV"**
3. Guardar o ficheiro CSV num local seguro (ex: pen USB)
4. Repetir para todos os computadores
5. Fundir todos os ficheiros CSV num único ficheiro para análise

## Suporte

Para problemas ou questões:
1. Verificar a secção de Resolução de Problemas acima
2. Certificar que todos os ficheiros estão presentes e em localizações corretas
3. Tentar executar num navegador diferente
4. Verificar a consola do navegador para mensagens de erro (tecla F12)

## Licença

Este projeto usa face-api.js que tem licença MIT.

---

**Versão do Jogo**: 1.0
**Última Atualização**: Outubro 2025
**Desenhado para**: Estudantes com 15+ anos
