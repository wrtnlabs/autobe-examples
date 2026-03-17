import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallProductPurchaseSnapshotOptionValueCollector } from "./ShoppingMallProductPurchaseSnapshotOptionValueCollector";

export namespace ShoppingMallProductPurchaseSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallProductPurchaseSnapshot.ICreate;
    shoppingMallOrders: IEntity;
    shoppingMallOrderItems: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    const shoppingMallProductPurchaseSnapshots: IEntity = { id };
    return {
      id,
      product_name: props.body.product_name,
      product_description: props.body.product_description,
      sku_code: props.body.sku_code,
      unit_price: props.body.unit_price,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      orderItem: {
        connect: { id: props.shoppingMallOrderItems.id },
      },
      product:
        props.body.shopping_mall_product_id != null
          ? {
              connect: { id: props.body.shopping_mall_product_id },
            }
          : undefined,
      productVariant:
        props.body.shopping_mall_product_variant_id != null
          ? {
              connect: { id: props.body.shopping_mall_product_variant_id },
            }
          : undefined,
      optionValues:
        props.body.optionValues !== undefined &&
        props.body.optionValues.length > 0
          ? {
              create: await ArrayUtil.asyncMap(
                props.body.optionValues,
                (body) =>
                  ShoppingMallProductPurchaseSnapshotOptionValueCollector.collect(
                    {
                      body,
                      shoppingMallOrders: props.shoppingMallOrders,
                      shoppingMallOrderItems: props.shoppingMallOrderItems,
                      shoppingMallProductPurchaseSnapshots,
                    },
                  ),
              ),
            }
          : undefined,
    } satisfies Prisma.shopping_mall_product_purchase_snapshotsCreateInput;
  }
}
