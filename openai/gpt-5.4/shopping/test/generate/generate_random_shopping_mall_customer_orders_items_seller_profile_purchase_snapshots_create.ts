import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_seller_profile_purchase_snapshot } from "../prepare/prepare_random_shopping_mall_seller_profile_purchase_snapshot";

export async function generate_random_shopping_mall_customer_orders_items_seller_profile_purchase_snapshots_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallSellerProfilePurchaseSnapshot.ICreate>
      | undefined;
    params: {
      orderId: string;
      itemId: string;
    };
  },
): Promise<IShoppingMallSellerProfilePurchaseSnapshot> {
  const prepared: IShoppingMallSellerProfilePurchaseSnapshot.ICreate =
    prepare_random_shopping_mall_seller_profile_purchase_snapshot(props.body);
  const result: IShoppingMallSellerProfilePurchaseSnapshot =
    await api.functional.shoppingMall.customer.orders.items.sellerProfilePurchaseSnapshots.create(
      connection,
      {
        body: prepared,
        orderId: props.params.orderId,
        itemId: props.params.itemId,
      },
    );
  return result;
}
