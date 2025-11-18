import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerDailyStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDailyStat";

/**
 * Validate that admin can query a high-risk segment of seller daily stats using
 * refund and rating filters.
 *
 * Business goal:
 *
 * - Ensure /shoppingMall/admin/analytics/sellerDailyStats correctly applies
 *   minRefundedOrderCount and maxAverageRating filters and returns a
 *   well-formed, paginated page of IShoppingMallSellerDailyStat.ISummary
 *   records representing potentially risky seller-day snapshots.
 *
 * Workflow
 *
 * 1. Join an admin via POST /auth/admin/join, which also authenticates and sets
 *    Authorization header on the shared connection.
 * 2. Build an IShoppingMallSellerDailyStat.IRequest payload focusing on high-risk
 *    signals:
 *
 *    - MinRefundedOrderCount: a positive threshold (e.g., 3) to target sellers/days
 *         with elevated refunds.
 *    - MaxAverageRating: a relatively low ceiling (e.g., 3.0) to target
 *         underperforming seller days.
 *    - Page/limit: small, deterministic pagination window.
 * 3. Call PATCH /shoppingMall/admin/analytics/sellerDailyStats with the request
 *    body.
 * 4. Assert that the response conforms to
 *    IPageIShoppingMallSellerDailyStat.ISummary.
 * 5. For each record in data:
 *
 *    - Refunded_order_count >= minRefundedOrderCount
 *    - Average_rating <= maxAverageRating
 *    - Basic invariants like non-negative dispute_opened_count, dispute_lost_count,
 *         late_shipment_count.
 * 6. Validate that pagination metadata is coherent with data length and requested
 *    limit.
 */
export async function test_api_admin_seller_daily_stats_high_refund_and_low_rating_segment(
  connection: api.IConnection,
) {
  // 1. Join an admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Prepare high-risk filter request
  const minRefundedOrderCount: number & tags.Type<"int32"> = 3 as number &
    tags.Type<"int32">;
  const maxAverageRating = 3.0;

  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    minRefundedOrderCount,
    maxAverageRating,
    sortBy: "stats_date",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallSellerDailyStat.IRequest;

  // 3. Call analytics search endpoint
  const page: IPageIShoppingMallSellerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      {
        body: requestBody,
      },
    );

  // 4. Type-level assertion for page wrapper
  typia.assert<IPageIShoppingMallSellerDailyStat.ISummary>(page);
  const pagination = page.pagination;
  const data = page.data;

  // Basic pagination sanity checks
  TestValidator.predicate(
    "pagination limit must be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed pagination.limit when limit > 0",
    () =>
      pagination.limit === 0
        ? data.length === 0
        : data.length <= pagination.limit,
  );

  // 5. Per-record validation
  for (const stat of data) {
    typia.assert<IShoppingMallSellerDailyStat.ISummary>(stat);

    // Ensure seller summary shape is intact
    typia.assert<IShoppingMallSeller.ISummary>(stat.seller);

    TestValidator.predicate(
      "refunded_order_count must respect minRefundedOrderCount filter",
      stat.refunded_order_count >= minRefundedOrderCount,
    );
    TestValidator.predicate(
      "average_rating must respect maxAverageRating filter",
      stat.average_rating <= maxAverageRating,
    );

    // Optional high-risk-related invariants: these counters must be non-negative
    TestValidator.predicate(
      "dispute_opened_count should be non-negative",
      stat.dispute_opened_count >= 0,
    );
    TestValidator.predicate(
      "dispute_lost_count should be non-negative",
      stat.dispute_lost_count >= 0,
    );
    TestValidator.predicate(
      "late_shipment_count should be non-negative",
      stat.late_shipment_count >= 0,
    );
  }

  // 6. Pagination and data alignment relative to current page
  TestValidator.equals(
    "current page number should match requested page when there is data or records",
    pagination.current,
    1,
  );
}
