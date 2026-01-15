import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderCollector {
  export async function collect(props: {
    body: IShoppingMallOrder.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
    shoppingMallOrderAddresses: IEntity;
    shoppingMallPaymentMethods: IEntity;
  }) {
    return {
      id: v4(),
      status: "pending",
      currency: "USD",
      total_amount: 0,
      shipping_cost: 0,
      tax_amount: 0,
      order_number:
        "O-" +
        new Date().getFullYear().toString().substring(2) +
        (new Date().getMonth() + 1).toString().padStart(2, "0") +
        new Date().getDate().toString().padStart(2, "0") +
        "-" +
        v4().substring(0, 4).toUpperCase(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      placed_from: "WEB",
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
      shopping_mall_order_items: {
        create: [],
      },
      shopping_mall_order_addresses: {
        connect: { id: props.shoppingMallOrderAddresses.id },
      },
      shopping_mall_order_payments: {
        connect: { id: props.shoppingMallPaymentMethods.id },
      },
      shopping_mall_order_events: {
        create: [
          {
            id: v4(),
            status: "created",
            created_at: new Date(),
            actor_id: props.shoppingMallCustomers.id,
          },
        ],
      },
      shopping_mall_order_returns: undefined,
      shopping_mall_order_refunds: {
        create: [],
      },
      shopping_mall_delivery_trackings: {
        create: [],
      },
      shopping_mall_order_shipments: undefined,
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
