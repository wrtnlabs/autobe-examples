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
  }) {
    return {
      id: v4(),
      total_price: 0,
      payment_status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
      shippingAddress: {
        connect: { id: props.body.shippingAddressId },
      },
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
