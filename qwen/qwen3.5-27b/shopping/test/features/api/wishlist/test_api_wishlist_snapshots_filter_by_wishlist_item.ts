import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItemSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import type { IShoppingMallWishlistItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_wishlist_snapshots_filter_by_wishlist_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that customer can filter wishlist snapshots by a specific wishlist item ID.
   *
   * This test verifies that:
   * 1. Customer can add products to their wishlist (creating wishlist items)
   * 2. Wishlist snapshots can be filtered by specific wishlist item ID
   * 3. Filtered results contain only snapshots matching the specified item
   * 4. Pagination works correctly with filtered snapshot results
   */
  // 1. Setup: Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Add products to customer's wishlist to create wishlist items
  // Using random product IDs (assuming test environment has pre-existing products)
  const wishlistItems: IShoppingMallWishlistItem[] = [];
  // Attempt to add multiple products to wishlist
  for (let i = 0; i < 3; i++) {
    const productId = typia.random<string & tags.Format<"uuid">>();
    try {
      const wishlistItem =
        await api.functional.shoppingMall.customer.wishlist.create(
          customerConnection,
          { productId },
        );
      typia.assert(wishlistItem);
      wishlistItems.push(wishlistItem);
    } catch (exp) {
      // If product doesn't exist, continue with next attempt
      // In real test environment, products should exist
    }
  }
  // Ensure we have at least one wishlist item for testing
  if (wishlistItems.length === 0) {
    throw new Error(
      "Failed to create any wishlist items. Test environment may need pre-existing products.",
    );
  }
  // 3. Test: Filter snapshots by first wishlist item ID
  const targetWishlistItemId = wishlistItems[0].id;
  const filteredSnapshots =
    await api.functional.shoppingMall.customer.wishlist.snapshots.index(
      customerConnection,
      {
        body: {
          shopping_mall_wishlist_item_id: targetWishlistItemId,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallWishlistItemSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // 4. Validation: All returned snapshots must have matching wishlist item ID
  TestValidator.predicate(
    "all snapshots have matching wishlist item ID",
    filteredSnapshots.data.every(
      (snapshot) =>
        snapshot.shopping_mall_wishlist_item_id === targetWishlistItemId,
    ),
  );
  // 5. Validation: Pagination metadata reflects filtered results
  TestValidator.equals(
    "pagination current page",
    filteredSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filteredSnapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records match data length",
    filteredSnapshots.pagination.records === filteredSnapshots.data.length,
  );
  // 6. Test: Filter by second wishlist item ID to verify isolation
  if (wishlistItems.length > 1) {
    const secondWishlistItemId = wishlistItems[1].id;
    const secondFilteredSnapshots =
      await api.functional.shoppingMall.customer.wishlist.snapshots.index(
        customerConnection,
        {
          body: {
            shopping_mall_wishlist_item_id: secondWishlistItemId,
            page: 1,
            limit: 20,
          } satisfies IShoppingMallWishlistItemSnapshot.IRequest,
        },
      );
    typia.assert(secondFilteredSnapshots);
    // Verify second filter returns snapshots with correct wishlist item ID
    TestValidator.predicate(
      "second filter returns snapshots with correct wishlist item ID",
      secondFilteredSnapshots.data.every(
        (snapshot) =>
          snapshot.shopping_mall_wishlist_item_id === secondWishlistItemId,
      ),
    );
    // Verify data isolation: first and second filters return different items
    if (
      filteredSnapshots.data.length > 0 &&
      secondFilteredSnapshots.data.length > 0
    ) {
      TestValidator.notEquals(
        "different wishlist items have different snapshots",
        filteredSnapshots.data[0].id,
        secondFilteredSnapshots.data[0].id,
      );
    }
  }
  // 7. Test: Verify snapshot structure consistency
  if (filteredSnapshots.data.length > 0) {
    const firstSnapshot = filteredSnapshots.data[0];
    TestValidator.predicate(
      "snapshot has valid UUID ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSnapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot has valid date-time created_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstSnapshot.created_at,
      ),
    );
    TestValidator.predicate(
      "snapshot has non-empty snapshot_data",
      firstSnapshot.snapshot_data.length > 0,
    );
  }
  // 8. Test: Verify filter excludes other wishlist items
  if (wishlistItems.length > 1) {
    TestValidator.predicate(
      "filter excludes snapshots from other wishlist items",
      filteredSnapshots.data.every(
        (snapshot) =>
          snapshot.shopping_mall_wishlist_item_id !== wishlistItems[1].id,
      ),
    );
  }
}
