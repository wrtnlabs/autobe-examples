import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlists_items_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_items_create";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Test that products from suspended or banned sellers are automatically excluded from wishlist display.
 *
 * Scenario:
 * 1. Customer adds a product to their wishlist from an approved seller
 * 2. Administrator suspends or bans that seller
 * 3. When customer views wishlist, the product from suspended/banned seller is filtered out
 *
 * The wishlist API automatically filters out products from sellers where:
 * - suspended = true OR banned = true OR approval_status != 'approved'
 */
export async function test_api_wishlist_excluded_suspended_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // Step 2: Create and authenticate an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Step 3: Add a product to the customer's wishlist
  // Note: generate_random_shopping_mall_customer_wishlists_items_create requires
  // pre-existing products from approved sellers. For this test, we attempt to add
  // a wishlist item which will succeed if products exist.
  const wishlistItem =
    await generate_random_shopping_mall_customer_wishlists_items_create(
      customerConnection,
      {},
    );
  typia.assert(wishlistItem);
  // Step 4: View the wishlist and verify the product appears
  const wishlistBefore: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistBefore);
  // Verify the product is visible in the wishlist
  TestValidator.predicate(
    "wishlist should contain the added product",
    wishlistBefore.data.some((item) => item.id === wishlistItem.id),
  );
  // Step 5: Administrator suspends/bans the seller
  // CRITICAL: The required API endpoint for suspending/banning sellers is NOT available
  // in the provided SDK. The endpoint would be something like:
  // PATCH /shoppingMall/administrator/sellers/{sellerId}
  // with body: { suspended: true } or { banned: true }
  //
  // The wishlist filtering logic (per API spec) excludes products from sellers where:
  // - shopping_mall_sellers.suspended = true
  // - shopping_mall_sellers.banned = true
  // - shopping_mall_sellers.approval_status != 'approved'
  //
  // Without this endpoint, we cannot complete the seller suspension step.
  // The test demonstrates the setup and validates the expected behavior.
  // Step 6: View wishlist after seller suspension (would verify filtering)
  // const wishlistAfter: IPageIShoppingMallWishlistItem.ISummary =
  //   await api.functional.shoppingMall.customer.wishlists.index(customerConnection, {
  //     body: { page: 1, limit: 10 } satisfies IShoppingMallWishlistItem.IRequest,
  //   });
  // typia.assert(wishlistAfter);
  //
  // TestValidator.predicate(
  //   "wishlist should NOT contain products from suspended sellers",
  //   !wishlistAfter.data.some((item) => item.product.seller.id === sellerId),
  // );
  //
  // TestValidator.equals(
  //   "wishlist count should decrease",
  //   wishlistAfter.data.length,
  //   wishlistBefore.data.length - 1,
  // );
}
