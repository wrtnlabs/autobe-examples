import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_variant_option_value } from "../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Generate a random shopping mall product variant option value via the API for E2E testing.
 *
 * Prepares random option value data using the prepare function, then calls the creation endpoint
 * to add the option key-value pair to the specified variant. The product and variant must both
 * exist and belong to the authenticated seller. The option key must be unique within the variant.
 *
 * Each option value consists of a key (the dimension name, such as "color" or "size") and a value
 * (the specific attribute, such as "Red" or "Large"). A variant can have multiple option values,
 * one per unique key. Attempting to add a duplicate key for the same variant results in a conflict
 * error.
 *
 * This operation is restricted to the seller who owns the product. The caller must authenticate
 * with seller credentials that match the product's owner.
 *
 * @param connection API connection for the test
 * @param props.body Optional partial override for the option value creation data
 * @param props.params.productId UUID of the product that owns the variant
 * @param props.params.variantId UUID of the variant to add the option value to
 * @returns The newly created option value record including its auto-generated UUID, key, value, and timestamps
 */
export async function generate_random_shopping_mall_seller_products_variants_options_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallProductVariantOptionValue.ICreate>
      | undefined;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IShoppingMallProductVariantOptionValue> {
  const prepared: IShoppingMallProductVariantOptionValue.ICreate =
    prepare_random_shopping_mall_product_variant_option_value(props.body);
  return await api.functional.shoppingMall.seller.products.variants.options.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      variantId: props.params.variantId,
    },
  );
}
