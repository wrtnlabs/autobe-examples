import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductPurchaseSnapshotOptionValueCollector {
  export async function collect(props: {
    body: IShoppingMallProductPurchaseSnapshotOptionValue.ICreate;
    shoppingMallOrders: IEntity;
    shoppingMallOrderItems: IEntity;
    shoppingMallProductPurchaseSnapshots: IEntity;
  }) {
    return {
      id: v4(),
      option_name: props.body.option_name,
      option_value: props.body.option_value,
      display_order: props.body.display_order,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      productPurchaseSnapshot: {
        connect: {
          id: props.shoppingMallProductPurchaseSnapshots.id,
        },
      },
    } satisfies Prisma.shopping_mall_product_purchase_snapshot_option_valuesCreateInput;
  }
}
