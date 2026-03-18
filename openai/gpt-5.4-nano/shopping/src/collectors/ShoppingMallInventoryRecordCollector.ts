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
  }) {
    return {
      id: v4(),
      stock_quantity: props.body.stock_quantity,
      reserved_quantity: props.body.reserved_quantity,
      available_quantity: props.body.available_quantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      productVariant: {
        connect: { id: props.body.shopping_mall_product_variant_id },
      },
    } satisfies Prisma.shopping_mall_inventory_recordsCreateInput;
  }
}
