import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallInventoryRecordCollector {
  export async function collect(props: {
    body: IShoppingMallInventoryRecord.ICreate;
  }) {
    return {
      id: v4(),
      quantity_change: props.body.quantityChange,
      reason: props.body.reason,
      source_type: props.body.sourceType,
      source_id: null,
      created_at: new Date(),
      variant: {
        connect: { id: props.body.variantId },
      },
    } satisfies Prisma.shopping_mall_inventory_recordsCreateInput;
  }
}
