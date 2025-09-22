import './scss/styles.scss';

import {AuctionAPI} from "./components/AuctionAPI";
import {API_URL, CDN_URL} from "./utils/constants";
import {EventEmitter} from "./components/base/events";
import { cloneTemplate, createElement, ensureElement } from './utils/utils';
import { AppState, LotItem } from './components/AppData';
import { Page } from './components/Page';
import { CatalogChangeEvent, IOrderForm } from './types';
import { Auction, AuctionItem, BidItem, CatalogItem } from './components/Card';
import { Modal } from './components/common/Modal';
import { Cart } from './components/Cart';
import { Tabs } from './components/Tabs';
import { Order } from './components/Order';
import { Success } from './components/Success';

const events = new EventEmitter();
const api = new AuctionAPI(CDN_URL, API_URL);

// Чтобы мониторить все события, для отладки
events.onAll(({ eventName, data }) => {
    console.log(eventName, data);
});

// Все шаблоны
const cardCatalogTemplate = ensureElement<HTMLTemplateElement>('#card');
const cardPreviewTemplate = ensureElement<HTMLTemplateElement>('#preview');
const auctionTemplate = ensureElement<HTMLTemplateElement>('#auction');
const cardBasketTemplate = ensureElement<HTMLTemplateElement>('#bid');
const bidsTemplate = ensureElement<HTMLTemplateElement>('#bids');
const basketTemplate = ensureElement<HTMLTemplateElement>('#basket');
const tabsTemplate = ensureElement<HTMLTemplateElement>('#tabs');
const soldTemplate = ensureElement<HTMLTemplateElement>('#sold');
const orderTemplate = ensureElement<HTMLTemplateElement>('#order');
const successTemplate = ensureElement<HTMLTemplateElement>('#success');

// Модель данных приложения
const appData = new AppState({}, events);

// Глобальные контейнеры
const page = new Page(document.body, events);
const modal = new Modal(ensureElement<HTMLElement>('#modal-container'), events);
const cart = new Cart(cloneTemplate(basketTemplate), events);
const bids = new Cart(cloneTemplate(bidsTemplate), events);
const tabs = new Tabs(cloneTemplate(tabsTemplate), {
    onClick: (name) => {
        if (name === 'closed') events.emit('cart:open');
        else events.emit('bids:open');
    }
});
const order = new Order(cloneTemplate(orderTemplate), events);

// Переиспользуемые части интерфейса


// Дальше идет бизнес-логика
// Поймали событие, сделали что нужно

events.on<CatalogChangeEvent>('items:changed', () => {
    page.catalog = appData.catalog.map(item => {
        const card = new CatalogItem(cloneTemplate(cardCatalogTemplate), {
            onClick: () => events.emit('card:select', item)
        });
        console.log(card, "qwe");
        return card.render({
            title: item.title,
            image: item.image,
            description: item.about,
            status: {
                status: item.status,
                label: item.statusLabel
            },
        });
    });

    page.counter = appData.getClosedLots().length;
});

events.on('bids:open', () => {
    modal.render({
        content: createElement<HTMLElement>('div', {}, [
            tabs.render({
                selected: 'active'
            }),
            bids.render()
        ])
    });
});

events.on('cart:open', () => {
    modal.render({
        content: createElement<HTMLElement>('div', {}, [
            tabs.render({
                selected: 'closed'
            }),
            cart.render()
        ])
    });
});

events.on('card:select', (item: LotItem) => {
    appData.setPreview(item);
});

events.on('preview:changed', (item: LotItem) => {
    const showItem = (it: LotItem) => {
        const card = new AuctionItem(cloneTemplate(cardPreviewTemplate));
        const auction = new Auction(cloneTemplate(auctionTemplate), {
            onSubmit: (price) => {
                it.placeBid(price);
                auction.render({
                    status: it.status,
                    time: it.timeStatus,
                    label: it.auctionStatus,
                    nextBid: it.nextBid,
                    history: it.history
                });
            }
        });

        modal.render({
            content: card.render({
                title: it.title,
                image: it.image,
                description: it.description.split("\n"),
                status: auction.render({
                    status: it.status,
                    time: it.timeStatus,
                    label: it.auctionStatus,
                    nextBid: it.nextBid,
                    history: it.history
                })
            })
        });

        if (it.status === 'active') {
            auction.focus();
        }
    };

    if (item) {
        api.getLotItem(item.id)
            .then((result) => {
                item.description = result.description;
                item.history = result.history;
                showItem(item);
            })
            .catch((err) => {
                console.error(err);
            })
    } else {
        modal.close();
    }
});

events.on('auction:changed', () => {
    page.counter = appData.getClosedLots().length;
    bids.items = appData.getActiveLots().map(item => {
        const card = new BidItem(cloneTemplate(cardBasketTemplate), {
            onClick: () => events.emit('preview:changed', item)
        });
        return card.render({
            title: item.title,
            image: item.image,
            status: {
                amount: item.price,
                status: item.isMyBid
            }
        });
    });
    let total = 0;
    cart.items = appData.getClosedLots().map(item => {
        const card = new BidItem(cloneTemplate(soldTemplate), {
            onClick: (event) => {
                const checkbox = event.target as HTMLInputElement;
                appData.toggleOrderedLot(item.id, checkbox.checked);
                cart.total = appData.getTotal();
                cart.selected = appData.order.items;
            }
        });
        return card.render({
            title: item.title,
            image: item.image,
            status: {
                amount: item.price,
                status: item.isMyBid
            }
        });
    });
    cart.selected = appData.order.items;
    cart.total = total;
});

events.on(/^order\..*:change/, (data: { field: keyof IOrderForm, value: string }) => {
    appData.setOrderField(data.field, data.value);
});

events.on('order:open', () => {
    modal.render({
        content: order.render({
            phone: '',
            email: '',
            valid: false,
            errors: []
        })
    });
});

events.on('order:submit', () => {
    api.orderLots(appData.order)
        .then(() => {
            const success = new Success(cloneTemplate(successTemplate), {
                onClick: () => {
                    modal.close();
                    appData.clearBasket();
                    events.emit('auction:changed');
                }
            });

            modal.render({
                content: success.render({})
            });
        })
        .catch(err => {
            console.error(err);
        });
});

events.on('errors:change', (errors: Partial<IOrderForm>) => {
    const { email, phone } = errors;
    order.valid = !email && !phone;
    order.errors = Object.values({phone, email}).filter(i => !!i).join('; ');
});


// Получаем лоты с сервера
api.getLotList()
    .then(appData.setCatalog.bind(appData))
    .catch(err => {
        console.error(err);
    });

events.on('modal:open', () => {
    page.locked = true;
});

events.on('modal:close', () => {
    page.locked = false;
});
