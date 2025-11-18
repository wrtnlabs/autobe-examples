import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallReviewModerationAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationAnalytics";
import type { IShoppingMallReviewModerationByModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationByModerator";
import type { IShoppingMallReviewModerationByReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationByReason";
import type { IShoppingMallReviewModerationBySeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationBySeller";
import type { IShoppingMallReviewModerationByStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationByStatus";
import type { IShoppingMallReviewModerationTimeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationTimeBucket";
import type { IShoppingMallReviewModerationTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationTotals";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller-grouped review moderation analytics for admins.
 *
 * This test ensures that:
 *
 * 1. An admin can join/login and obtain an authorized context.
 * 2. The moderation analytics endpoint accepts a 60-day time window grouped by
 *    seller.
 * 3. The response structure matches IShoppingMallReviewModerationAnalytics.
 * 4. The bySeller breakdown contains seller summaries and non-negative counters.
 * 5. High-level consistency holds between totals.reportedReviews and the aggregate
 *    reportCount across sellers (no reports vs no reported reviews).
 */
export async function test_api_admin_review_moderation_analytics_seller_breakdown(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration + implicit login)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 2. Build a 60-day analytics request
  const now = new Date();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - sixtyDaysMs);

  const requestBody = {
    from: fromDate.toISOString(),
    to: now.toISOString(),
    groupBy: ["seller"],
  } satisfies IShoppingMallReviewModerationAnalytics.IRequest;

  // 3. Call moderation analytics endpoint
  const analytics: IShoppingMallReviewModerationAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.moderation.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IShoppingMallReviewModerationAnalytics>(analytics);

  // 4. Validate time range echo is logically ordered
  const timeRange: IShoppingMallAnalyticsTimeRange = analytics.timeRange;
  typia.assert<IShoppingMallAnalyticsTimeRange>(timeRange);

  const fromTime = new Date(timeRange.from).getTime();
  const toTime = new Date(timeRange.to).getTime();
  TestValidator.predicate(
    "analytics timeRange.from must be <= timeRange.to",
    fromTime <= toTime,
  );

  // 5. Validate bySeller breakdown entries
  const bySeller: IShoppingMallReviewModerationBySeller[] = analytics.bySeller;

  for (const entry of bySeller) {
    typia.assert<IShoppingMallReviewModerationBySeller>(entry);

    const sellerSummary: IShoppingMallSeller.ISummary = entry.seller;
    typia.assert<IShoppingMallSeller.ISummary>(sellerSummary);

    TestValidator.predicate(
      "seller id should be non-empty string",
      sellerSummary.id.length > 0,
    );
    TestValidator.predicate(
      "seller email should be non-empty string",
      sellerSummary.email.length > 0,
    );
    TestValidator.predicate(
      "seller status should be non-empty string",
      sellerSummary.status.length > 0,
    );

    TestValidator.predicate(
      "reportedReviewCount must be non-negative",
      entry.reportedReviewCount >= 0,
    );
    TestValidator.predicate(
      "reportCount must be non-negative",
      entry.reportCount >= 0,
    );
    TestValidator.predicate(
      "moderationActionCount must be non-negative",
      entry.moderationActionCount >= 0,
    );
  }

  // 6. Cross-check totals vs bySeller aggregated reportCount
  const totals: IShoppingMallReviewModerationTotals = analytics.totals;
  typia.assert<IShoppingMallReviewModerationTotals>(totals);

  const totalReportCountAcrossSellers = bySeller.reduce(
    (sum, entry) => sum + entry.reportCount,
    0,
  );

  TestValidator.predicate(
    "totalReportCountAcrossSellers must be non-negative",
    totalReportCountAcrossSellers >= 0,
  );
  TestValidator.predicate(
    "totals.reportedReviews must be non-negative",
    totals.reportedReviews >= 0,
  );

  if (totals.reportedReviews === 0) {
    TestValidator.equals(
      "when totals.reportedReviews is 0, per-seller reportCount should also be 0",
      totalReportCountAcrossSellers,
      0,
    );
  }

  if (totalReportCountAcrossSellers === 0) {
    TestValidator.equals(
      "when no per-seller reports exist, totals.reportedReviews should be 0",
      totals.reportedReviews,
      0,
    );
  }
}
