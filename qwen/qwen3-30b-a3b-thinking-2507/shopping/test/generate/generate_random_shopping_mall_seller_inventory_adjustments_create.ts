import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantInventory";
import { prepare_random_shopping_mall_inventory_adjustment } from "../prepare/prepare_random_shopping_mall_inventory_adjustment";
export async function generate_random_shopping_mall_seller_inventory_adjustments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallInventoryAdjustment.ICreate>;
  },
): Promise<IShoppingMallInventoryAdjustment> {
  const prepared: IShoppingMallInventoryAdjustment.ICreate =
    prepare_random_shopping_mall_inventory_adjustment(props.body);
  return await api.functional.shoppingMall.seller.inventory.adjustments.create(
    connection,
    {
      body: prepared,
    },
  );
}
