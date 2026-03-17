import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_purchase_snapshot } from "../prepare/prepare_random_shopping_mall_product_purchase_snapshot";

export async function generate_random_shopping_mall_customer_orders_items_product_purchase_snapshots_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallProductPurchaseSnapshot.ICreate>
      | undefined;
    params: {
      orderId: string;
      itemId: string;
    };
  },
): Promise<IShoppingMallProductPurchaseSnapshot> {
  const prepared: IShoppingMallProductPurchaseSnapshot.ICreate =
    prepare_random_shopping_mall_product_purchase_snapshot(props.body);
  const result: IShoppingMallProductPurchaseSnapshot =
    await api.functional.shoppingMall.customer.orders.items.productPurchaseSnapshots.create(
      connection,
      {
        body: prepared,
        orderId: props.params.orderId,
        itemId: props.params.itemId,
      },
    );
  return result;
}
