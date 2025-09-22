import { LotItem } from "../components/AppData";

export type LotStatus = 'wait' | 'active' | 'closed';

export interface IAuction {
    status: LotStatus;
    datetime: string;
    price: number;
    minPrice: number;
    history?: number[];
}

export interface ILotItem {
    id: string;
    title: string;
    about: string;
    description?: string;
    image: string;
}

export type ILot = ILotItem & IAuction;

export type LotUpdate = Pick<ILot, 'id' | 'datetime' | 'status' | 'price' | 'history'>;

export interface IOrderForm {
    email: string;
    phone: string;
}

export interface IOrder extends IOrderForm {
    items: string[]
}

export type FormErrors = Partial<Record<keyof IOrder, string>>;

export interface IBid {
    price: number
}

export interface IOrderResult {
    id: string;
}

export interface ICartView {
    items: HTMLElement[];
    total: number;
    selected: string[];
}

export type IBasketItem = Pick<ILot, 'id' | 'title' | 'price'> & {
    isMyBid: boolean
};

export interface IAppState {
    catalog: ILot[];
    basket: string[];
    preview: string | null;
    order: IOrder | null;
    loading: boolean;
}

export type CatalogChangeEvent = {
    catalog: LotItem[]
};

export type TabState = {
    selected: string
};

export type TabActions = {
    onClick: (tab: string) => void
}

export interface ISuccess {
    total: number;
}

export interface ISuccessActions {
    onClick: () => void;
}