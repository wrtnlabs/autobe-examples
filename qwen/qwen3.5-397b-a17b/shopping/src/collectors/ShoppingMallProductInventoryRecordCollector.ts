import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductInventoryRecordCollector {
  export async function collect(props: {
    body: IShoppingMallProductInventoryRecord.ICreate;
    shoppingMallProductVariants: IEntity;
  }) {
    return {
      id: v4(),
      quantity_change: props.body.quantity_change,
      reason: props.body.reason,
      created_at: new Date(),
      productVariant: { connect: { id: props.shoppingMallProductVariants.id } },
    } satisfies Prisma.shopping_mall_product_inventory_recordsCreateInput;
  }
}
