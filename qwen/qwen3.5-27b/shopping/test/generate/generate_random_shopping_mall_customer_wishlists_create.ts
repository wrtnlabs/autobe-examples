import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
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

import { prepare_random_shopping_mall_customer_wishlist } from "../prepare/prepare_random_shopping_mall_customer_wishlist";

/**
 * Generate a random shopping mall customer wishlist entry for E2E testing.
 *
 * Prepares random wishlist data using the prepare function, then calls the creation endpoint to add a product to the authenticated customer's wishlist. The wishlist stores products at the product level (not variant level), enabling customers to choose any available variant when ready to purchase. Each product can only be added once to a customer's wishlist.
 *
 * The productId is randomly generated as a valid UUID and can be overridden via the input parameter for specific test scenarios. The product must exist and not be deleted. If the product is already in the customer's wishlist, the operation fails with a conflict error.
 */
export async function generate_random_shopping_mall_customer_wishlists_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCustomerWishlist.ICreate> | undefined;
  },
): Promise<IShoppingMallCustomerWishlist> {
  const prepared: IShoppingMallCustomerWishlist.ICreate =
    prepare_random_shopping_mall_customer_wishlist(props.body);
  const result: IShoppingMallCustomerWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: prepared,
    });
  return result;
}
