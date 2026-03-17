import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallOrderCollector {
  export async function collect(props: {
    body: IEcommerceMallOrder.ICreate;
    ecommerceMallCustomers: IEntity;
    ecommerceMallCustomerSessions: IEntity;
    totalPrice: number;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    const orderNumber: string = `ORD-${now.getTime().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return {
      id,
      order_number: orderNumber,
      shipping_recipient_name: props.body.shipping_recipient_name,
      shipping_phone_number: props.body.shipping_phone_number,
      shipping_street_address: props.body.shipping_street_address,
      shipping_city: props.body.shipping_city,
      shipping_state: props.body.shipping_state,
      shipping_postal_code: props.body.shipping_postal_code,
      shipping_country: props.body.shipping_country,
      total_price: props.totalPrice,
      status: "paid",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      orderItems: undefined,
    } satisfies Prisma.ecommerce_mall_ordersCreateInput;
  }
}
