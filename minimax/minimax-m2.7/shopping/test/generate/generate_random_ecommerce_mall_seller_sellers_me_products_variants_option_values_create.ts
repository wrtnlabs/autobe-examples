import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product_variant_option_value } from "../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Generate a random product variant option value via the API for E2E testing.
 *
 * Creates an option value (key-value pair) for a product variant, such as color=Red
 * or size=Large. The variant must belong to a product owned by the authenticated seller.
 * If an option with the same key already exists for the variant, it will be updated instead.
 *
 * @param connection API connection context
 * @param props.body Optional DeepPartial override for test customization
 * @param props.params.productId UUID of the parent product
 * @param props.params.variantId UUID of the variant to add the option to
 * @returns The created or updated option value record
 */
export async function generate_random_ecommerce_mall_seller_sellers_me_products_variants_option_values_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProductVariantOptionValue.ICreate>;
    params: {
      productId: string;
      variantId: string;
    };
  },
): Promise<IEcommerceMallProductVariantOptionValue> {
  const prepared: IEcommerceMallProductVariantOptionValue.ICreate =
    prepare_random_ecommerce_mall_product_variant_option_value(props.body);
  return await api.functional.ecommerceMall.seller.sellers.me.products.variants.option_values.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
      variantId: props.params.variantId,
    },
  );
}
