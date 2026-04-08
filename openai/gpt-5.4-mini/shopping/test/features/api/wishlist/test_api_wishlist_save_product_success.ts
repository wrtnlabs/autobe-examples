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

export async function test_api_wishlist_save_product_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test saving a product to the authenticated customer's wishlist.
   *
   * Validates the complete wishlist creation flow for an authenticated customer.
   * The test confirms that the endpoint returns a persisted product-level
   * wishlist item with nested wishlist and product summaries, and that the
   * returned record can be used in subsequent wishlist browsing.
   *
   * 1. Register and authenticate a customer.
   * 2. Create a wishlist item for a valid product reference through the wishlist API.
   * 3. Validate the created wishlist item response structure and timestamps.
   * 4. Confirm the saved entry represents a product-level wishlist record.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const saved =
    await generate_random_mall_platform_customer_wishlists_wishlist_items_create(
      customerConnection,
      {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(saved);
  TestValidator.equals(
    "wishlist item uses the saved product summary",
    saved.product.id,
    saved.product.id,
  );
  TestValidator.predicate(
    "wishlist item includes a nested wishlist summary",
    saved.wishlist.id.length > 0,
  );
  TestValidator.predicate(
    "wishlist item includes a nested product summary",
    saved.product.name.length > 0 && saved.product.description.length > 0,
  );
  TestValidator.predicate(
    "wishlist item timestamps are present",
    saved.createdAt.length > 0 && saved.updatedAt.length > 0,
  );
  TestValidator.equals("wishlist item is active", saved.deletedAt, null);
  TestValidator.predicate(
    "wishlist item is product-level and not variant-specific",
    typeof saved.product.id === "string" && saved.product.id.length > 0,
  );
}
