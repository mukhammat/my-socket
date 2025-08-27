const debug = true;
const clog = (messages) => {
    if (debug)
        console.log(messages);
};
/**
 * @example
 * import http from 'http';
 *
 * let server = http.createServer();
 * export let wss = new WebSocketServer({ server });
 *
 * const mySocket = new MySocket();
 *
 * mySocket.request('/manager', async (c)=> {
 *  console.log('1');
 * }, async (c) => {
 *  console.log('2');
 * })
 *
 * mySocket.request('/client', async (c)=> {
 *  c.data.set('client', 'client');
 * }, async (c) => {
 *  console.log(c.data.get('client'));
 * })
 *
 * mySocket.request('/client/:orderId', async (c) => {
 *  const { orderId } = c.data.get('params');
 *  console.log(orderId);
 * })
 *
 * mySocket.catch = (err, ws) => {
 *  console.error('Custom catch');
 *  ws.close()
 * }
 *
 * mySocket.connect(wss);
 */
export class MySocket {
    // Хендлеры впринципе поняно о чем речь
    handlers = [];
    wss = null;
    // И так понятно)
    catch;
    constructor() { }
    // Он в конце, ни то хендлеров подписанных после него не увидит
    connect(wss) {
        if (this.wss) {
            this.wss = wss;
            this.wss.on("connection", async (ws, req) => {
                try {
                    for (const callback of this.handlers) {
                        // data это те данные которых можно вызывать между хендлерами
                        const data = new Map();
                        for (const c of callback) {
                            const b = await c({ ws, req, data });
                            if (b === 1) {
                                break;
                            }
                        }
                    }
                }
                catch (err) {
                    return this.catch
                        ? this.catch(err, ws)
                        : console.error(err);
                }
            });
        }
    }
    // До connect()
    request(url, ...handlers) {
        handlers.unshift(this.checkBefore(url));
        handlers.push(this.checkAfter());
        this.handlers.push(handlers);
    }
    // Перед всеми хендлерами
    checkBefore(url) {
        const result = async ({ ws, req, data }) => {
            if (url.includes(':')) {
                const customUrl = url.split('/');
                const requestUrl = req.url?.split('/');
                if (customUrl.length !== requestUrl?.length) {
                    return 1;
                }
                for (let i = 0; i < customUrl.length; i++) {
                    if (customUrl[i].startsWith(':')) {
                        const key = customUrl[i].split(':')[1];
                        if (!data.has('params')) {
                            data.set('params', { [key]: requestUrl[i] });
                        }
                        else {
                            data.get('params')[key] = requestUrl[i];
                        }
                    }
                    else if (customUrl[i] !== requestUrl[i]) {
                        return 1;
                    }
                }
            }
            else if (req?.url !== url) {
                clog(`* Пропуск ${url}`);
                return 1;
            }
        };
        return result;
    }
    // После все хендлеров
    checkAfter() {
        const result = async (c) => {
        };
        return result;
    }
}
