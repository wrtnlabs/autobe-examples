import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallInventoryHistoryCollector {
  export async function collect(props: {
    body: IShoppingMallInventoryHistory.ICreate;
  }) {
    const id = v4();
    return {
      id,
      quantity_delta: props.body.quantityDelta,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      productVariant: {
        connect: { id: props.body.shoppingMallProductVariantId },
      },
    } satisfies Prisma.shopping_mall_inventory_historiesCreateInput;
  }
}
