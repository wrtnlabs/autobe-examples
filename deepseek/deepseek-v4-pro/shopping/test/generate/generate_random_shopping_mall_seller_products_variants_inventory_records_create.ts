import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_inventory_record } from "../prepare/prepare_random_shopping_mall_inventory_record";

/**
 * Generate a random inventory record for a product variant via the API for E2E testing.
 *
 * Prepares random inventory record data using the prepare function, then calls the creation
 * endpoint on the specified variant. The product and variant must already exist and belong
 * to the authenticated seller.
 *
 * The inventory record tracks stock changes — positive quantity_change values represent
 * restocking, while negative values represent manual adjustments or losses. Each record
 * includes a human-readable reason explaining the change.
 *
 * @param connection API connection with seller authentication
 * @param props.body Optional DeepPartial overrides for the inventory record creation data
 * @param props.params Required product and variant UUIDs identifying the target variant
 * @returns The newly created inventory record with all fields populated
 */
export async function generate_random_shopping_mall_seller_products_variants_inventory_records_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallInventoryRecord.ICreate>;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IShoppingMallInventoryRecord> {
  const prepared: IShoppingMallInventoryRecord.ICreate =
    prepare_random_shopping_mall_inventory_record(props.body);
  const result: IShoppingMallInventoryRecord =
    await api.functional.shoppingMall.seller.products.variants.inventory_records.create(
      connection,
      {
        productId: props.params.productId,
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
