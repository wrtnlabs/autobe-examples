import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSnapshot";

/**
 * Validate basic seller and date range filters for admin seller performance
 * search.
 *
 * Business goal
 *
 * - Ensure that an authenticated admin can search seller performance snapshots
 *   with simple seller and snapshot_date range filters.
 * - Confirm that the response is a well-formed paginated page of
 *   IShoppingMallSellerPerformanceSnapshot.ISummary.
 * - Verify that returned snapshots belong only to the requested seller set and
 *   that snapshot_date falls within the requested range.
 *
 * Steps
 *
 * 1. Join as a new admin using POST /auth/admin/join.
 *
 *    - Use realistic random email, password, and session metadata (href, referrer).
 *    - Rely on the SDK to attach the issued access token to the connection headers.
 * 2. Prepare a basic search request body for PATCH
 *    /shoppingMall/admin/analytics/sellerPerformance using
 *    IShoppingMallSellerPerformanceSnapshot.IRequest.
 *
 *    - Provide sellerIds with a small set of random UUIDs.
 *    - Provide snapshotDateFrom and snapshotDateTo forming a valid window.
 *    - Provide explicit page and limit values.
 * 3. Call the analytics search endpoint with the prepared filters.
 * 4. Assert that the response is structurally valid
 *    (IPageIShoppingMallSellerPerformanceSnapshot.ISummary) via typia.assert.
 * 5. Validate pagination metadata consistency using only documented invariants.
 * 6. For each returned snapshot in data:
 *
 *    - Seller.id must be one of the requested sellerIds.
 *    - Snapshot_date must be between snapshotDateFrom and snapshotDateTo
 *         (inclusive).
 * 7. Ensure there is no seller outside the requested set by verifying that all
 *    seller ids in the result are contained in sellerIds.
 */
export async function test_api_admin_seller_performance_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Join as a new admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Build seller performance search request with basic filters
  const sellerIds: string[] = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  const now = new Date();
  const rangeMs = 1000 * 60 * 60 * 24 * 7; // 7 days
  const fromDate = new Date(now.getTime() - rangeMs);
  const snapshotDateFrom = fromDate.toISOString();
  const snapshotDateTo = now.toISOString();

  const page = 1;
  const limit = 10;

  const requestBody = {
    sellerIds,
    snapshotDateFrom,
    snapshotDateTo,
    page,
    limit,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  // 3. Call the analytics search endpoint
  const pageResult =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      {
        body: requestBody,
      },
    );

  // 4. Type assertion on the response
  typia.assert(pageResult);
  typia.assert(pageResult.pagination);

  const pagination = pageResult.pagination;

  // 5. Validate pagination metadata consistency with generic invariants
  TestValidator.predicate(
    "pagination current should be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be non-negative",
    pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination records should be >= number of items in data",
    pagination.records >= pageResult.data.length,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative and at least 1 when records exist",
    (pagination.records === 0 && pagination.pages === 0) ||
      (pagination.records > 0 && pagination.pages >= 1),
  );

  if (pagination.records > 0) {
    TestValidator.predicate(
      "data length should not exceed pagination limit",
      pageResult.data.length <= pagination.limit,
    );
  }

  // 6. Per-item validations for seller and snapshot_date filters
  for (const snapshot of pageResult.data) {
    typia.assert(snapshot);
    typia.assert(snapshot.seller);

    // Seller id must be in requested sellerIds
    TestValidator.predicate(
      "snapshot seller.id must be one of requested sellerIds",
      sellerIds.includes(snapshot.seller.id),
    );

    // snapshot_date must be within [snapshotDateFrom, snapshotDateTo]
    const snapshotTime = new Date(snapshot.snapshot_date).getTime();
    const fromTime = new Date(snapshotDateFrom).getTime();
    const toTime = new Date(snapshotDateTo).getTime();

    TestValidator.predicate(
      "snapshot_date is within requested date range (inclusive)",
      snapshotTime >= fromTime && snapshotTime <= toTime,
    );
  }

  // 7. Ensure there is no seller outside the requested set
  const distinctSellerIds = Array.from(
    new Set(pageResult.data.map((s) => s.seller.id)),
  );
  TestValidator.predicate(
    "all seller ids in result are contained within requested sellerIds",
    distinctSellerIds.every((id) => sellerIds.includes(id)),
  );
}
