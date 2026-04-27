import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product_variant } from "../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Generate a random product variant (SKU) under an existing product for E2E testing.
 *
 * Prepares random variant creation data using the prepare function with optional
 * overrides, then calls the API endpoint to create a new variant under the specified
 * product. The variant starts with zero stock and requires a separate restock
 * operation before becoming available for purchase.
 *
 * @param connection The API connection object
 * @param props.body   Optional partial input to override random variant data
 * @param props.params.productId The UUID of the parent product
 * @returns The created product variant with options and computed stock
 */
export async function generate_random_e_commerce_mall_seller_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallProductVariant.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IECommerceMallProductVariant> {
  const prepared: IECommerceMallProductVariant.ICreate =
    prepare_random_ecommerce_mall_product_variant(props.body);
  return await api.functional.eCommerceMall.seller.products.variants.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
