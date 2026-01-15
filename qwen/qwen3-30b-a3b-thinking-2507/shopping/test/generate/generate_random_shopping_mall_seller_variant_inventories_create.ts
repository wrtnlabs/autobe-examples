import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantInventory";
import { prepare_random_shopping_mall_variant_inventory } from "../prepare/prepare_random_shopping_mall_variant_inventory";
export async function generate_random_shopping_mall_seller_variant_inventories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallVariantInventory.ICreate>;
  },
): Promise<IShoppingMallVariantInventory> {
  const prepared = prepare_random_shopping_mall_variant_inventory(props.body);
  return await api.functional.shoppingMall.seller.variant.inventories.create(
    connection,
    {
      body: prepared,
    },
  );
}
