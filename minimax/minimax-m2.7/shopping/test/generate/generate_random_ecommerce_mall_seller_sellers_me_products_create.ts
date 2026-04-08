import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product } from "../prepare/prepare_random_ecommerce_mall_product";

/**
 * Generate a random ecommerce mall product via the API for E2E testing.
 *
 * Creates a new product listing for the authenticated seller using random data.
 * The seller must have an "approved" account status to create products.
 *
 * This function prepares random product data using the prepare function and
 * submits it to the product creation endpoint. A valid category must exist
 * before calling this function (can be created via prepare_random_ecommerce_mall_category).
 *
 * @param connection API connection with authenticated seller session
 * @param props.body Optional partial product data to override random generation
 * @returns The newly created product with generated UUID, timestamps, and default values
 */
export async function generate_random_ecommerce_mall_seller_sellers_me_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProduct.ICreate>;
  },
): Promise<IEcommerceMallProduct> {
  const prepared: IEcommerceMallProduct.ICreate =
    prepare_random_ecommerce_mall_product(props.body);
  const result: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
