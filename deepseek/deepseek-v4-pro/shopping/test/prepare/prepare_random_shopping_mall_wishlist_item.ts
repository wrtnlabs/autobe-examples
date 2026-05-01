import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall wishlist item creation data for E2E testing.
 *
 * Generates a complete IShoppingMallWishlistItem.ICreate with a randomized
 * UUID for the product reference. The product_id references an existing,
 * active product that belongs to a non-suspended seller.
 *
 * The customer identity is resolved from the authenticated session at
 * runtime, so this function only prepares the product reference portion.
 * Tests can override the product_id via the DeepPartial input to target
 * specific products for wishlist operations.
 */
export function prepare_random_shopping_mall_wishlist_item(
  input?: DeepPartial<IShoppingMallWishlistItem.ICreate>,
): IShoppingMallWishlistItem.ICreate {
  return {
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
