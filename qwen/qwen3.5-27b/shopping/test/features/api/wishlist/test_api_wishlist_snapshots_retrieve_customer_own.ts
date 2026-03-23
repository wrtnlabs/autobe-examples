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

/**
 * Test that an authenticated customer can retrieve their own wishlist item snapshots with pagination.
 *
 * This test verifies:
 * 1. Customer authentication and authorization
 * 2. Wishlist item creation with automatic snapshot generation
 * 3. Paginated retrieval of snapshots
 * 4. Data isolation (customer can only see their own snapshots)
 * 5. Proper pagination metadata and sorting
 */
export async function test_api_wishlist_snapshots_retrieve_customer_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create a wishlist item (which automatically creates snapshots)
  // Note: Using random productId as product creation endpoint is not available in test scope
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      {
        productId,
      },
    );
  typia.assert(wishlistItem);
  // 3. Retrieve wishlist item snapshots with default pagination
  const snapshotsResponse: IPageIShoppingMallWishlistItemSnapshot.ISummary =
    await api.functional.shoppingMall.customer.wishlist.snapshots.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallWishlistItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is positive",
    snapshotsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshotsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    snapshotsResponse.pagination.pages >= 0,
  );
  // 5. Validate snapshots data array exists
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(snapshotsResponse.data),
  );
  // 6. Validate each snapshot belongs to the authenticated customer's wishlist item
  await ArrayUtil.asyncForEach(
    snapshotsResponse.data,
    async (snapshot, index) => {
      typia.assert(snapshot);
      // Verify snapshot belongs to the created wishlist item (data isolation)
      TestValidator.equals(
        `snapshot ${index} belongs to customer's wishlist item`,
        snapshot.shopping_mall_wishlist_item_id,
        wishlistItem.id,
      );
      // Verify snapshot_data is a valid JSON string
      TestValidator.predicate(
        `snapshot ${index} snapshot_data is valid JSON`,
        () => {
          try {
            JSON.parse(snapshot.snapshot_data);
            return true;
          } catch {
            return false;
          }
        },
      );
    },
  );
  // 7. Verify snapshots are sorted by created_at in descending order (newest first)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const prevDate = new Date(
        snapshotsResponse.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(snapshotsResponse.data[i].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i - 1} created_at >= snapshot ${i} created_at (descending order)`,
        prevDate >= currDate,
      );
    }
  }
  // 8. Test pagination with custom parameters
  const paginatedResponse: IPageIShoppingMallWishlistItemSnapshot.ISummary =
    await api.functional.shoppingMall.customer.wishlist.snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallWishlistItemSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "custom pagination page matches request",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom pagination limit matches request",
    paginatedResponse.pagination.limit,
    10,
  );
  // 9. Test filtering by specific wishlist item ID
  const filteredResponse: IPageIShoppingMallWishlistItemSnapshot.ISummary =
    await api.functional.shoppingMall.customer.wishlist.snapshots.index(
      customerConnection,
      {
        body: {
          shopping_mall_wishlist_item_id: wishlistItem.id,
        } satisfies IShoppingMallWishlistItemSnapshot.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.predicate(
    "filtered snapshots belong to specified wishlist item",
    filteredResponse.data.every(
      (snapshot) => snapshot.shopping_mall_wishlist_item_id === wishlistItem.id,
    ),
  );
  // 10. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilteredResponse: IPageIShoppingMallWishlistItemSnapshot.ISummary =
    await api.functional.shoppingMall.customer.wishlist.snapshots.index(
      customerConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IShoppingMallWishlistItemSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredResponse);
  TestValidator.predicate(
    "date filtered snapshots are within range",
    dateFilteredResponse.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.created_at).getTime();
      return (
        snapshotDate >= oneDayAgo.getTime() && snapshotDate <= now.getTime()
      );
    }),
  );
}
