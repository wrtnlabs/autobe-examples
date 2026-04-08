import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall wishlist item creation data for E2E testing.
 *
 * Generates a complete IShoppingMallWishlistItem.ICreate with a randomized product UUID. The shopping_mall_product_id represents the product to be added to the authenticated customer's wishlist.
 *
 * This function supports partial input overrides via DeepPartial, allowing tests to customize specific fields while auto-generating the rest.
 */
export function prepare_random_shopping_mall_wishlist_item(
  input?: DeepPartial<IShoppingMallWishlistItem.ICreate>,
): IShoppingMallWishlistItem.ICreate {
  return {
    shopping_mall_product_id:
      input?.shopping_mall_product_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
