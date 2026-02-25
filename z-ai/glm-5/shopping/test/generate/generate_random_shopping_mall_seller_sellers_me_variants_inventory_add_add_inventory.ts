import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_inventory_history } from "../prepare/prepare_random_shopping_mall_product_inventory_history";

/**
 * Generates a random inventory history record for a product variant.
 *
 * This function creates a test inventory addition record for a product variant
 * by first preparing the test data using the prepare function, then calling
 * the API to create the actual resource.
 *
 * @param connection - The API connection object
 * @param props - Properties including optional body overrides and required variantId
 * @returns The created inventory history record
 */
export async function generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductInventoryHistory.ICreate>;
    params: {
      variantId: string;
    };
  },
): Promise<IShoppingMallProductInventoryHistory> {
  const prepared: IShoppingMallProductInventoryHistory.ICreate =
    prepare_random_shopping_mall_product_inventory_history(props.body);
  const result: IShoppingMallProductInventoryHistory =
    await api.functional.shoppingMall.seller.sellers.me.variants.inventory.add.addInventory(
      connection,
      {
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
