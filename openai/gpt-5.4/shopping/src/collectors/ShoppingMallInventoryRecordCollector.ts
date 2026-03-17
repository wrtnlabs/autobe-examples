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
    productVariant: IEntity;
  }) {
    return {
      id: v4(),
      quantity_change: props.body.quantity_change,
      reason: props.body.reason,
      occurred_at: new Date(props.body.occurred_at),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      productVariant: {
        connect: {
          id: props.productVariant.id,
        },
      },
    } satisfies Prisma.shopping_mall_inventory_recordsCreateInput;
  }
}
