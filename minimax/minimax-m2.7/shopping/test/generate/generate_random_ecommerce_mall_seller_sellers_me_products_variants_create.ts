import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product_variant } from "../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Generate a random product variant for E2E testing.
 *
 * Creates a product variant attached to an existing product specified by productId.
 * The variant requires a unique SKU code and at least one option value pair
 * (e.g., color: Red, size: Large). Optionally overrides the product's base price.
 *
 * @param connection API connection context
 * @param props.body Optional partial variant creation data for customization
 * @param props.params.productId The unique identifier of the product this variant belongs to
 * @returns The created product variant with all its option values
 */
export async function generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProductVariant.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IEcommerceMallProductVariant> {
  const prepared: IEcommerceMallProductVariant.ICreate =
    prepare_random_ecommerce_mall_product_variant(props.body);
  const result: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.create(
      connection,
      {
        body: prepared,
        productId: props.params.productId,
      },
    );
  return result;
}
