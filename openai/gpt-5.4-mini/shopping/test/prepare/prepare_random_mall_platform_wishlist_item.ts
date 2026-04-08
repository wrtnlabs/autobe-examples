import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform wishlist item creation data for E2E testing.
 *
 * Generates a complete IMallPlatformWishlistItem.ICreate object with a valid
 * product UUID, while allowing tests to override any field through DeepPartial
 * input.
 */
export function prepare_random_mall_platform_wishlist_item(
  input?: DeepPartial<IMallPlatformWishlistItem.ICreate> | undefined,
): IMallPlatformWishlistItem.ICreate {
  return {
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
