import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_variant } from "../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Generate a random product variant for an existing product via the API for E2E testing.
 *
 * Prepares random product variant data using the prepare function, then calls the creation endpoint.
 * The variant includes a unique SKU code, optional price override, variant option key-value pairs
 * (such as color, size, material), and initial stock quantity. The variant is created under the
 * specified productId and becomes immediately available for customers to view and purchase.
 *
 * This function requires a valid productId parameter representing an existing product owned by
 * the authenticated seller. The SKU code must be unique within the product, and variant options
 * define the distinguishing characteristics of this variant.
 */
export async function generate_random_shopping_mall_seller_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductVariant.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallProductVariant> {
  const prepared: IShoppingMallProductVariant.ICreate =
    prepare_random_shopping_mall_product_variant(props.body);
  return await api.functional.shoppingMall.seller.products.variants.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
