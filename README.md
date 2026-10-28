# EditYou — versão Vercel

Projeto estático HTML + API serverless para a biblioteca pública da comunidade. Os áudios são publicados somente quando a pessoa escolhe “Compartilhar publicamente” e confirma que tem direito de compartilhá-los.

## Publicar pela interface da Vercel
1. Extraia este ZIP.
2. Envie a pasta para um repositório GitHub.
3. Na Vercel, escolha **Add New → Project** e importe esse repositório.
4. Mantenha `Framework Preset: Other`, `Build Command` vazio e `Output Directory: public` (ou deixe a configuração do `vercel.json` detectá-lo).
5. Antes de testar o compartilhamento, abra o projeto na Vercel → **Storage** → crie/conecte um **Blob store**. Isso disponibiliza `BLOB_READ_WRITE_TOKEN` para as funções. Se a Vercel pedir, faça redeploy depois de conectar o armazenamento.
6. Clique **Deploy** e teste o endereço público.

## Como testar
- Abra **Biblioteca da comunidade** e clique em atualizar.
- Publique um recurso de teste; para áudio, use arquivo de até 4 MB.
- Marque a confirmação de direitos e clique **Compartilhar publicamente**.
- Abra o site em uma janela anônima ou outro navegador e confirme que o recurso aparece.

## Desenvolvimento local (opcional)
Requer Node.js e uma conta Vercel:
`npm install`
`npx vercel login`
`npx vercel link`
`npx vercel env pull .env.local`
`npm run dev`

A API usa Vercel Blob para guardar os arquivos e os metadados públicos. Não lê histórico de downloads privado do usuário; cada arquivo precisa ser selecionado e compartilhado explicitamente.
