import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_variant } from "../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Generate a random shopping mall product variant via the API for E2E testing.
 *
 * Prepares random variant data using the prepare function, then calls the creation endpoint.
 * The variant is created with a randomized SKU code, option values, and optional price.
 * The shopping_mall_product_id is generated as a random UUID for general endpoint testing.
 *
 * This function is designed for seller-authorized test scenarios where the seller owns
 * the referenced product. The created variant starts with zero stock and must be
 * restocked through the inventory management endpoint.
 *
 * @param connection - The API connection with authentication headers
 * @param props - Optional configuration with body overrides for customization
 * @returns The created product variant entity with generated ID and timestamps
 */
export async function generate_random_shopping_mall_seller_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductVariant.ICreate>;
  },
): Promise<IShoppingMallProductVariant> {
  const prepared: IShoppingMallProductVariant.ICreate =
    prepare_random_shopping_mall_product_variant(props.body);
  const result: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.variants.create(connection, {
      body: prepared,
    });
  return result;
}
