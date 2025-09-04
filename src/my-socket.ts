import { WebSocketServer, WebSocket, RawData } from 'ws';
import http from 'http';

const debug = true;

const clog = (messages: unknown) => {
    if(debug) console.log(messages);
}

export type Context = {
    ws: WebSocket,
    req: http.IncomingMessage,
    data: Map<any, any>
}

export type HandlerType = (c: Context) => Promise<void | 1>

type CatchHandlerType<T = unknown | any> = ((err: T, ws: WebSocket) => void) | undefined;

//Messages
type MessageContext = {
    ws: WebSocket,
    req: http.IncomingMessage,
    message: RawData
}
type MessageHandlerType = (c: MessageContext) => Promise<void | 1>;

/**
 * @example
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
    private wss: WebSocketServer | null = null;
    // Хендлеры впринципе поняно о чем речь
    private handlers: HandlerType[][] = [];
    private messages: MessageHandlerType[] = [];

    // И так понятно)
    public catch: CatchHandlerType;

    constructor() {}

    
    // До connect()
    request(url: string, ...handlers: HandlerType[]) {
        handlers.unshift(this.checkBefore(url));
        this.handlers.push(handlers);
        handlers.push(this.checkAfter());
    }
    
    // До connect()
    message(message: MessageHandlerType) {
        this.messages.push(message);
    }
    
    // Core/Ядро

    // Он в конце, ни то хендлеров подписанных после него не увидит
    connect(wss: WebSocketServer) {
        this.wss = wss;

        this.wss.on("connection", async (ws, req) => {
            try {
                for(const callback of this.handlers) {

                    // data это те данные которых можно вызывать между хендлерами
                    const data = new Map();

                    for(const c of callback) {
                        const b = await c({ws, req, data});

                        if(b === 1) {
                            break;
                        }
                    }
                }

                ws.on('message', async (message) => {
                    for(const callback of this.messages) {
                        const b = await callback({ws, req, message});
                        if(b === 1) {
                            break;
                        }
                    }
                });
            } catch(err) {

                return this.catch 
                    ? this.catch(err, ws)
                    : console.error(err);
            }
        })
    }

    // Перед всеми хендлерами
    private checkBefore(url: string) {
        const result: HandlerType = async ({ws, req, data}) => {

            clog(`* Новый WS запрос на ${req.url}, проверка на ${url}`);
            if(url.includes(':')) {
                clog('* Обнаружен параметр в URL');
                const customUrl = url.split('/');
                const requestUrl = req.url?.split('/');

                if(customUrl.length !== requestUrl?.length) {
                    return 1;
                }

                for(let i = 0; i < customUrl.length; i++) {
                    if(customUrl[i].startsWith(':')) {
                        const key = customUrl[i].split(':')[1];

                        if(!data.has('params')) {
                            data.set('params', {[key]: requestUrl[i]});
                        } else {
                            data.get('params')[key] = requestUrl[i];
                        }

                    } else if(customUrl[i] !== requestUrl[i]) {
                        return 1;
                    }
                }


            } else if(req?.url !== url) {
                clog(`* Пропуск ${url}`);
                return 1;
            }
        };

        return result;
    }

    // После все хендлеров
    private checkAfter() {
        const result: HandlerType = async (c) => {
            return;
        };

        return result;
    }
}