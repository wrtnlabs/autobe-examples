import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_wishlist_item } from "../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Generate a random shopping mall wishlist item via the API for E2E testing.
 *
 * Prepares random wishlist item data using the prepare function, then calls the creation endpoint to add a product to the authenticated customer's wishlist. The function returns the complete wishlist item with product information and creation timestamp.
 *
 * The wishlist item links an authenticated member to a product they want to track for future purchase consideration. Each product can appear only once in a customer's wishlist.
 *
 * @param connection - API connection configuration for the test
 * @param props - Optional configuration with body overrides
 * @param props.body - Partial wishlist item creation data to override random generation
 * @returns The created wishlist item with full entity data including product summary
 */
export async function generate_random_shopping_mall_member_wishlist_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallWishlistItem.ICreate>;
  },
): Promise<IShoppingMallWishlistItem> {
  const prepared: IShoppingMallWishlistItem.ICreate =
    prepare_random_shopping_mall_wishlist_item(props.body);
  const result: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.member.wishlist_items.create(connection, {
      body: prepared,
    });
  return result;
}
