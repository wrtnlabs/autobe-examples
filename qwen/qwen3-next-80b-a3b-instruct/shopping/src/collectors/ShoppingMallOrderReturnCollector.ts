import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderReturnCollector {
  export async function collect(props: {
    body: IShoppingMallOrderReturn.ICreate;
    shoppingMallOrderItems: IEntity;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      status: "pending",
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      order: {
        connect: { id: props.shoppingMallOrderItems.id },
      },
      shopping_mall_order_refunds: undefined,
    } satisfies Prisma.shopping_mall_order_returnsCreateInput;
  }
}
