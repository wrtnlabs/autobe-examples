import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product } from "../prepare/prepare_random_ecommerce_mall_product";

/**
 * Generate a random product for the seller's catalog via the API for E2E testing.
 *
 * Prepares random product data using the prepare function, then calls the creation endpoint.
 * The product is immediately visible in category listings upon successful creation.
 * Requires seller approval status to be "approved".
 */
export async function generate_random_ecommerce_mall_seller_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProduct.ICreate> | undefined;
  },
): Promise<IEcommerceMallProduct> {
  const prepared: IEcommerceMallProduct.ICreate =
    prepare_random_ecommerce_mall_product(props.body);
  const result: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.create(connection, {
      body: prepared,
    });
  return result;
}
