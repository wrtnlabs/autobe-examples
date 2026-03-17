import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallInventoryRecordCollector {
  export async function collect(props: {
    body: IShoppingMallInventoryRecord.ICreate;
    shoppingMallProductVariants: IEntity;
    shoppingMallSellers: IEntity;
    shoppingMallSellerSessions: IEntity;
  }) {
    return {
      id: v4(),
      quantity: props.body.quantity,
      reason_type:
        props.body.quantity > 0 ? "manual_restock" : "manual_adjustment",
      note: props.body.note ?? null,
      created_at: new Date(),
      productVariant: { connect: { id: props.shoppingMallProductVariants.id } },
    } satisfies Prisma.shopping_mall_inventory_recordsCreateInput;
  }
}
