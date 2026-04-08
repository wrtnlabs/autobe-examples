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
 * Generate a random product variant via the API for E2E testing.
 *
 * Creates a product variant attached to the product specified by productId using the
 * prepare function for randomized test data. The variant includes a unique SKU code,
 * human-readable option values, and an optional price override.
 *
 * The productId path parameter identifies the parent product, which must exist and be
 * owned by the authenticated seller. The prepare function generates realistic variant
 * data including Color/Size combinations and variable pricing scenarios.
 *
 * @param connection - The API connection for making the request
 * @param props - Generation parameters including optional body overrides and required productId
 * @param props.body - Optional partial variant creation data to override prepare function defaults
 * @param props.params - URL path parameters including the parent product ID
 * @returns The newly created product variant entity with all fields including id and timestamps
 */
export async function generate_random_shopping_mall_seller_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductVariant.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallProductVariant> {
  const prepared: IShoppingMallProductVariant.ICreate =
    prepare_random_shopping_mall_product_variant(props.body);
  const result: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: props.params.productId,
        body: prepared,
      },
    );
  return result;
}
