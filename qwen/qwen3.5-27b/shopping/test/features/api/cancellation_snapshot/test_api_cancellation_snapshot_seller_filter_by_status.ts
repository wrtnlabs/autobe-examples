import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationSnapshot";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can filter their cancellation snapshots by cancellation request status.
 *
 * This test validates that sellers can retrieve cancellation snapshots filtered by:
 * - Status (approved, rejected, pending)
 * - Date range
 * - Combined filters
 *
 * The test ensures pagination metadata correctly reflects filtered results.
 */
export async function test_api_cancellation_snapshot_seller_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Test filtering by status='approved'
  const approvedSnapshots =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    approvedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    approvedSnapshots.pagination.limit,
    20,
  );
  // 3. Test filtering by status='rejected'
  const rejectedSnapshots =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // 4. Test filtering by date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeSnapshots =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      {
        body: {
          dateRange: {
            from: oneWeekAgo.toISOString(),
            to: now.toISOString(),
          },
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  // Validate all snapshots are within date range (business logic)
  TestValidator.predicate(
    "date range filter returns snapshots within range",
    dateRangeSnapshots.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.createdAt);
      return snapshotDate >= oneWeekAgo && snapshotDate <= now;
    }),
  );
  // 5. Test combined filters (status + dateRange)
  const combinedFilterSnapshots =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          dateRange: {
            from: oneWeekAgo.toISOString(),
            to: now.toISOString(),
          },
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterSnapshots);
  // Validate combined filters work correctly (business logic)
  TestValidator.predicate(
    "combined filters return snapshots within date range",
    combinedFilterSnapshots.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.createdAt);
      return snapshotDate >= oneWeekAgo && snapshotDate <= now;
    }),
  );
  // 6. Test pagination with filtered results
  TestValidator.predicate(
    "pagination records match data length",
    combinedFilterSnapshots.pagination.records >=
      combinedFilterSnapshots.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    combinedFilterSnapshots.pagination.pages ===
      Math.ceil(
        combinedFilterSnapshots.pagination.records /
          combinedFilterSnapshots.pagination.limit,
      ),
  );
  // 7. Test empty results with non-matching filter
  const emptyResults =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(emptyResults);
  // Validate empty results have correct pagination
  TestValidator.equals(
    "empty results pagination current",
    emptyResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty results pagination limit",
    emptyResults.pagination.limit,
    20,
  );
}
