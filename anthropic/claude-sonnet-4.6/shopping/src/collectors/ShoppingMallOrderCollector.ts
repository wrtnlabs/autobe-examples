import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderCollector {
  export async function collect(props: {
    body: IShoppingMallOrder.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      // Primary key
      id: v4(),
      // Derived status — always 'paid' at initial order placement
      status: "paid",
      // total_price is computed by the service layer from product variant snapshots;
      // initialized to 0 here and updated within the same transaction
      total_price: 0,
      // Shipping address snapshot fields (immutable after order placement)
      recipient_name: props.body.recipient_name,
      recipient_phone: props.body.recipient_phone,
      shipping_address_line1: props.body.shipping_address_line1,
      shipping_address_line2: props.body.shipping_address_line2 ?? null,
      shipping_city: props.body.shipping_city,
      shipping_state: props.body.shipping_state ?? null,
      shipping_postal_code: props.body.shipping_postal_code,
      shipping_country: props.body.shipping_country,
      // Timestamps
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relation — connect to authenticated customer
      customer: { connect: { id: props.shoppingMallCustomers.id } },
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
