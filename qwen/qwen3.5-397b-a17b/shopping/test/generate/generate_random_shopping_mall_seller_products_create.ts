import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product } from "../prepare/prepare_random_shopping_mall_product";

/**
 * Generate a random shopping mall product via the API for E2E testing.
 *
 * Creates a new product listing by preparing random product data using the
 * prepare function, then calling the seller products creation endpoint. The
 * product is automatically associated with the authenticated seller from the
 * connection context.
 *
 * The generated product includes a randomized name, description, category
 * assignment, and base price. All fields support input override through the
 * DeepPartial body parameter for test customization. The product is created
 * in an unavailable state until at least one variant is added.
 *
 * @param connection - The API connection with seller authentication context
 * @param props - Optional configuration with body for partial data override
 * @returns The newly created product record with all populated fields
 */
export async function generate_random_shopping_mall_seller_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProduct.ICreate>;
  },
): Promise<IShoppingMallProduct> {
  const prepared: IShoppingMallProduct.ICreate =
    prepare_random_shopping_mall_product(props.body);
  const result: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: prepared,
    });
  return result;
}
