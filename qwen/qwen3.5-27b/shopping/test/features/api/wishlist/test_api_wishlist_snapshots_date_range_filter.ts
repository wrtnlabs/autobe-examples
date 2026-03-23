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

export async function test_api_wishlist_snapshots_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that customer can filter wishlist snapshots by creation date range.
   *
   * This test validates the date range filtering functionality for wishlist
   * item snapshots. It creates multiple snapshots at different timestamps
   * and verifies that the API correctly returns only snapshots within the
   * specified date range.
   */
  // 1. Setup: Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create first wishlist item (snapshot 1)
  const productId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const wishlistItem1 =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      { productId: productId1 },
    );
  typia.assert(wishlistItem1);
  const snapshot1Time = wishlistItem1.createdAt;
  // 3. Create second wishlist item (snapshot 2) after a small delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  const productId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const wishlistItem2 =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      { productId: productId2 },
    );
  typia.assert(wishlistItem2);
  const snapshot2Time = wishlistItem2.createdAt;
  // 4. Create third wishlist item (snapshot 3) after another delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  const productId3: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const wishlistItem3 =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      { productId: productId3 },
    );
  typia.assert(wishlistItem3);
  const snapshot3Time = wishlistItem3.createdAt;
  // 5. Test date range filter: Get snapshots between snapshot2Time and snapshot3Time
  const filteredSnapshots =
    await api.functional.shoppingMall.customer.wishlist.snapshots.index(
      customerConnection,
      {
        body: {
          created_at_from: snapshot2Time,
          created_at_to: snapshot3Time,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(filteredSnapshots);
  // 6. Validate that filtered results contain snapshots within the date range
  TestValidator.predicate(
    "filtered snapshots exist",
    filteredSnapshots.data.length > 0,
  );
  // 7. Validate all returned snapshots are within the date range
  await ArrayUtil.asyncForEach(filteredSnapshots.data, async (snapshot) => {
    const snapshotDate = new Date(snapshot.created_at).getTime();
    const fromDate = new Date(snapshot2Time).getTime();
    const toDate = new Date(snapshot3Time).getTime();
    TestValidator.predicate(
      `snapshot ${snapshot.id} is within date range [${snapshot2Time}, ${snapshot3Time}]`,
      snapshotDate >= fromDate && snapshotDate <= toDate,
    );
  });
  // 8. Validate pagination metadata
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
  // 9. Test with empty date range (before first snapshot)
  const emptyRangeSnapshots =
    await api.functional.shoppingMall.customer.wishlist.snapshots.index(
      customerConnection,
      {
        body: {
          created_at_from: new Date(
            new Date(snapshot1Time).getTime() - 1000 * 60 * 60 * 24,
          ).toISOString(), // 1 day before first snapshot
          created_at_to: new Date(
            new Date(snapshot1Time).getTime() - 1000 * 60 * 30,
          ).toISOString(), // 30 minutes before first snapshot
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(emptyRangeSnapshots);
  TestValidator.equals(
    "empty date range returns no snapshots",
    emptyRangeSnapshots.data.length,
    0,
  );
}
