import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_wishlists_wishlist_items_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_wishlist_items_create";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

/**
 * Test idempotent deletion of a missing wishlist item.
 *
 * Validates that removing a wishlist item succeeds the first time and that
 * repeating the same delete request for an already-missing item remains safe.
 * This ensures the customer-owned wishlist entry can be deleted without side
 * effects and that the endpoint behaves as an idempotent no-op after the item
 * has already been removed.
 *
 * 1. Register and authenticate a customer using a dedicated connection.
 * 2. Create a wishlist item for that customer.
 * 3. Delete the created wishlist item once.
 * 4. Delete the same wishlist item again and confirm the second call completes
 *    successfully without error.
 */
export async function test_api_wishlist_item_delete_idempotent_missing_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email:
        `customer_${RandomGenerator.alphabets(8)}@example.com` satisfies string &
          tags.Format<"email">,
      password: "password123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/landing" satisfies string &
        tags.Format<"uri">,
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const wishlistItem =
    await api.functional.mallPlatform.customer.wishlists.wishlist_items.create(
      customerConnection,
      {
        body: {
          product_id: productId,
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);
  await api.functional.mallPlatform.customer.wishlists.wishlist_items.erase(
    customerConnection,
    {
      wishlistItemId: wishlistItem.id,
    },
  );
  await api.functional.mallPlatform.customer.wishlists.wishlist_items.erase(
    customerConnection,
    {
      wishlistItemId: wishlistItem.id,
    },
  );
}
