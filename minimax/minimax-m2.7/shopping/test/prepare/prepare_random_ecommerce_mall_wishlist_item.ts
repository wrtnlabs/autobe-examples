import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random wishlist item creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallWishlistItem.ICreate with a randomized
 * product ID. The productId is required and must reference an existing,
 * non-deleted product in the catalog.
 *
 * @param input - Optional DeepPartial override for test customization
 * @returns Complete wishlist item creation data
 */
export function prepare_random_ecommerce_mall_wishlist_item(
  input?: DeepPartial<IEcommerceMallWishlistItem.ICreate>,
): IEcommerceMallWishlistItem.ICreate {
  return {
    productId: input?.productId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
