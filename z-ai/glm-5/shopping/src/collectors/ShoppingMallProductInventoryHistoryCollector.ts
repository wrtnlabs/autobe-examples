import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductInventoryHistoryCollector {
  export async function collect(props: {
    body: IShoppingMallProductInventoryHistory.ICreate;
    shoppingMallProductVariants: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      quantity_change: props.body.quantity,
      reason: props.body.reason,
      created_at: new Date(),
      variant: { connect: { id: props.shoppingMallProductVariants.id } },
    } satisfies Prisma.shopping_mall_product_inventory_historiesCreateInput;
  }
}
