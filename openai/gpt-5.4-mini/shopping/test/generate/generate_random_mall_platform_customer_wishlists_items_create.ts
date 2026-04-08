import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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
 * Prepares wishlist item creation data using the prepare function, then calls
 * the authenticated customer's wishlist item creation endpoint.
 *
 * The request saves a product into the current customer's wishlist and returns
 * the created wishlist item entity for immediate use in test scenarios.
 *
 * @param connection Connection to the API server.
 * @param props Optional input overriding fields for the wishlist item create payload.
 * @returns The created mall platform wishlist item.
 */
export async function generate_random_mall_platform_customer_wishlists_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformWishlistItem.ICreate> | undefined;
  },
): Promise<IMallPlatformWishlistItem> {
  const prepared: IMallPlatformWishlistItem.ICreate =
    prepare_random_mall_platform_wishlist_item(props.body);
  return await api.functional.mallPlatform.customer.wishlists.items.create(
    connection,
    {
      body: prepared,
    },
  );
}
