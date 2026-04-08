import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product } from "../prepare/prepare_random_shopping_mall_product";

/**
 * Generate a random shopping mall product via the API for E2E testing.
 *
 * Prepares random product data using the prepare function, then calls the creation endpoint.
 * The product includes a name, description, base price, and optional category assignment.
 * After creation, the product is visible in search results but marked as unavailable
 * until at least one variant with available stock is added.
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
