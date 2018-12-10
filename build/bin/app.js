let core = require('@idio/core'); if (core && core.__esModule) core = core.default;
const { facebookDialogUrl, exchange, graphGet } = require('@demimonde/graph');

const { CLIENT_ID, SECRET, SESSION_KEY } = process.env

;(async () => {
  const { app, router, url } = await core({
    static: {
      use: true,
      root: 'static',
    },
    session: { use: true, keys: [SESSION_KEY || 'the-key'] },
  }, { port: process.env.PORT || 5000 })
  router.get('/', async (ctx, next) => {
    const token = ctx.session.token
    const l = token ? '<a href="/signout">Sing out</a>' : '<a href="/auth"><img src="fb.png"></a>'
    const w = ctx.session.name ? `welcome back ${ctx.session.name}` : ''
    ctx.body = `<!doctype html>
<html>hello demimonde
${w}
<br>
${l}</html>
`
    await next()
  })
  router.get('/auth', async (ctx) => {
    if (!CLIENT_ID) {
      ctx.body = 'CLIENT_ID is not set on the app.'
      ctx.status = 500
      return
    }
    const state = Math.floor(Math.random() * 10000)
    ctx.session.state = state
    const redirect = `${ctx.protocol}://${ctx.host}/redirect`
    const u = facebookDialogUrl({
      client_id: CLIENT_ID,
      redirect_uri: redirect,
      scope: 'manage_pages',
      state,
    })
    ctx.redirect(u)
  })
  router.get('/signout', async (ctx) => {
    ctx.session.token = null
    ctx.redirect('/')
  })
  router.get('/redirect', async (ctx) => {
    if (!SECRET) {
      ctx.body = 'SECRET is not set on the app.'
      return
    }
    const redirect = `${ctx.protocol}://${ctx.host}/redirect`
    const { state } = ctx.query
    if (state != ctx.session.state) {
      ctx.body = 'Wrong state'
      ctx.status = 500
      return
    }
    ctx.session.state = null
    if (!ctx.query.code) throw new Error('Code Not Found.')

    const token = await exchange({
      client_id: CLIENT_ID,
      client_secret: SECRET,
      code: ctx.query.code,
      redirect_uri: redirect,
    })
    ctx.session.token = token
    const data = await graphGet('/me', token, {}, true)
    ctx.session.name = data.name
    ctx.session.id = data.id
    ctx.redirect('/')
  })
  app.use(router.routes())
  console.log('Started on %s', url)
})()