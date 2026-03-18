import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderItemCollector {
  export async function collect(props: {
    body: IShoppingMallOrderItem.ICreate;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      quantity: props.body.quantity,
      status: "paid",
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
      refunded_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      order: {
        connect: { id: props.body.shoppingMallOrderId },
      },
      productVariant: {
        connect: { id: props.body.shoppingMallProductVariantId },
      },
    } satisfies Prisma.shopping_mall_order_itemsCreateInput;
  }
}
