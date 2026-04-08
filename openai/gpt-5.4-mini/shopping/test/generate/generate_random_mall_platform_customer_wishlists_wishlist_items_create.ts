import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_wishlist_item } from "../prepare/prepare_random_mall_platform_wishlist_item";

/**
 * Generate a random mall platform wishlist item via the API for E2E testing.
 *
 * Prepares valid wishlist item creation data with the prepare function, then
 * calls the authenticated customer wishlist API to create the actual wishlist
 * entry. The generated request only includes the product identifier because
 * wishlist ownership is resolved server-side from the current session.
 *
 * Any provided partial input is forwarded to the prepare function so tests can
 * target a specific product while keeping the request body valid.
 */
export async function generate_random_mall_platform_customer_wishlists_wishlist_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformWishlistItem.ICreate> | undefined;
  },
): Promise<IMallPlatformWishlistItem> {
  const prepared: IMallPlatformWishlistItem.ICreate =
    prepare_random_mall_platform_wishlist_item(props.body);
  return await api.functional.mallPlatform.customer.wishlists.wishlist_items.create(
    connection,
    {
      body: prepared,
    },
  );
}
