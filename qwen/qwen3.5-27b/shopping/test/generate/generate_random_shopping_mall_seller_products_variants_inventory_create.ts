import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_inventory_record } from "../prepare/prepare_random_shopping_mall_inventory_record";

/**
 * Generate a random shopping mall inventory record via the API for E2E testing.
 *
 * Prepares random inventory record data using the prepare function, then calls the creation endpoint.
 * The inventory record tracks stock quantity changes (positive for restocking, negative for adjustments)
 * for a specific product variant. Both productId and variantId URL parameters are required to identify
 * which variant's inventory is being modified.
 *
 * The quantity_change field is randomly generated as a non-zero integer between -100 and 100,
 * and the reason field contains a random paragraph describing the inventory change purpose.
 */
export async function generate_random_shopping_mall_seller_products_variants_inventory_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallInventoryRecord.ICreate> | undefined;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IShoppingMallInventoryRecord> {
  const prepared: IShoppingMallInventoryRecord.ICreate =
    prepare_random_shopping_mall_inventory_record(props.body);
  return await api.functional.shoppingMall.seller.products.variants.inventory.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      variantId: props.params.variantId,
    },
  );
}
