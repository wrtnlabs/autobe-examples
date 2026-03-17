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
    const id: string = v4();
    return {
      id,
      quantity_change: props.body.quantity_change,
      reason: props.body.reason,
      created_at: new Date(),
      variant: { connect: { id: props.shoppingMallProductVariants.id } },
      order: undefined,
      cancellationRequest: undefined,
      refundRequest: undefined,
      seller: { connect: { id: props.shoppingMallSellers.id } },
    } satisfies Prisma.shopping_mall_inventory_recordsCreateInput;
  }
}
