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
    return {
      id: v4(),
      quantity_change: props.body.quantity_change,
      reason: props.body.reason,
      created_at: new Date(),
      metadata: props.body.metadata ?? null,
      variant: { connect: { id: props.body.variant_id } },
      orderItem: undefined,
      seller: undefined,
    } satisfies Prisma.shopping_mall_inventory_historiesCreateInput;
  }
}
