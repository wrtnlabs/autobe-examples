import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_wishlist_item } from "../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Generate a random wishlist item via the API for E2E testing.
 *
 * Prepares random wishlist item data using the prepare function, then calls
 * the wishlist creation endpoint to add a product to the authenticated
 * customer's wishlist. The customer identity is resolved from the
 * authenticated session at runtime.
 *
 * The product_id is randomized by the prepare function but can be overridden
 * via the `body` prop to target a specific product for wishlist operations.
 * The product must exist, be non-deleted, and belong to a non-suspended
 * seller, otherwise the API call will fail.
 */
export async function generate_random_shopping_mall_customer_wishlist_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallWishlistItem.ICreate>;
  },
): Promise<IShoppingMallWishlistItem> {
  const prepared: IShoppingMallWishlistItem.ICreate =
    prepare_random_shopping_mall_wishlist_item(props.body);
  return await api.functional.shoppingMall.customer.wishlist_items.create(
    connection,
    { body: prepared },
  );
}
