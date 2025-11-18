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

export async function test_api_admin_review_moderation_analytics_filtered_by_state_and_reason(
  connection: api.IConnection,
) {
  /**
   * Validate that review moderation analytics respects filters for states and
   * reason codes, and that groupBy and timeBucket shape the breakdown sections
   * of the response.
   *
   * Business flow
   *
   * 1. Register an admin via POST /auth/admin/join to obtain an authenticated
   *    admin context.
   * 2. Build a 30-day time window ending at "now" and construct an
   *    IShoppingMallReviewModerationAnalytics.IRequest with:
   *
   *    - From/to: that window
   *    - ModerationStates: ["pending_review", "under_review"]
   *    - ReportStatuses: ["open", "under_review"]
   *    - ReasonCodes: ["offensive_content", "spam"]
   *    - SellerIds, productIds: omitted
   *    - GroupBy: ["status", "reason", "time"]
   *    - TimeBucket: "day".
   * 3. Call PATCH /shoppingMall/admin/analytics/reviews/moderation using
   *    api.functional.shoppingMall.admin.analytics.reviews.moderation.index.
   * 4. Assert the basic shape with typia.assert and then validate that:
   *
   *    - TimeRange.from <= timeRange.to and both are valid date-time strings.
   *    - Totals fields are all non-negative.
   *    - Every byReason.reasonCode, if any rows exist, is one of the requested
   *         reason codes, and its numeric counters are non-negative.
   *    - ByStatus and timeSeries rows, when present, have non-negative counters and
   *         monotonic bucketStart <= bucketEnd.
   */

  // 1. Admin join (authentication precondition)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.example.com/onboarding",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Build a 30-day time window (from: 30 days ago, to: now)
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - thirtyDaysMs);
  const fromIso = fromDate.toISOString();
  const toIso = now.toISOString();

  const requestBody = {
    from: fromIso,
    to: toIso,
    moderationStates: ["pending_review", "under_review"],
    reportStatuses: ["open", "under_review"],
    reasonCodes: ["offensive_content", "spam"],
    groupBy: ["status", "reason", "time"],
    timeBucket: "day",
  } satisfies IShoppingMallReviewModerationAnalytics.IRequest;

  // 3. Call analytics endpoint
  const analytics: IShoppingMallReviewModerationAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.moderation.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IShoppingMallReviewModerationAnalytics>(analytics);

  // 4. Validate timeRange
  const timeRange: IShoppingMallAnalyticsTimeRange = analytics.timeRange;
  typia.assert<IShoppingMallAnalyticsTimeRange>(timeRange);

  const fromMillis = Date.parse(timeRange.from);
  const toMillis = Date.parse(timeRange.to);

  TestValidator.predicate(
    "analytics timeRange.from should be valid date-time",
    () => !Number.isNaN(fromMillis),
  );
  TestValidator.predicate(
    "analytics timeRange.to should be valid date-time",
    () => !Number.isNaN(toMillis),
  );
  TestValidator.predicate(
    "analytics timeRange.from should not be after timeRange.to",
    () => fromMillis <= toMillis,
  );

  // 5. Validate totals: all counters non-negative
  const totals: IShoppingMallReviewModerationTotals = analytics.totals;
  typia.assert<IShoppingMallReviewModerationTotals>(totals);

  TestValidator.predicate(
    "totals.totalReviews is non-negative",
    totals.totalReviews >= 0,
  );
  TestValidator.predicate(
    "totals.reportedReviews is non-negative",
    totals.reportedReviews >= 0,
  );
  TestValidator.predicate(
    "totals.openReports is non-negative",
    totals.openReports >= 0,
  );
  TestValidator.predicate(
    "totals.resolvedReports is non-negative",
    totals.resolvedReports >= 0,
  );
  TestValidator.predicate(
    "totals.moderationActions is non-negative",
    totals.moderationActions >= 0,
  );
  TestValidator.predicate(
    "totals.helpfulVotes is non-negative",
    totals.helpfulVotes >= 0,
  );
  TestValidator.predicate(
    "totals.netHelpfulScore is an integer (can be negative or positive)",
    Number.isInteger(totals.netHelpfulScore),
  );
  TestValidator.predicate(
    "totals.averageResolutionTimeSeconds is non-negative",
    totals.averageResolutionTimeSeconds >= 0,
  );

  // 6. Validate byReason breakdown respects reasonCodes filter
  const expectedReasonCodes = requestBody.reasonCodes ?? [];
  for (const row of analytics.byReason) {
    const reasonRow: IShoppingMallReviewModerationByReason = row;
    typia.assert<IShoppingMallReviewModerationByReason>(reasonRow);

    TestValidator.predicate(
      "byReason.reasonCode must be within requested reasonCodes",
      expectedReasonCodes.includes(reasonRow.reasonCode),
    );
    TestValidator.predicate(
      "byReason.reportCount is non-negative",
      reasonRow.reportCount >= 0,
    );
    TestValidator.predicate(
      "byReason.resolvedReportCount is non-negative",
      reasonRow.resolvedReportCount >= 0,
    );
    TestValidator.predicate(
      "byReason.averageResolutionTimeSeconds is non-negative",
      reasonRow.averageResolutionTimeSeconds >= 0,
    );
  }

  // 7. Validate byStatus numeric fields are non-negative
  for (const row of analytics.byStatus) {
    const statusRow: IShoppingMallReviewModerationByStatus = row;
    typia.assert<IShoppingMallReviewModerationByStatus>(statusRow);

    TestValidator.predicate(
      "byStatus.reportCount is non-negative",
      statusRow.reportCount >= 0,
    );
    TestValidator.predicate(
      "byStatus.reviewCount is non-negative",
      statusRow.reviewCount >= 0,
    );
    TestValidator.predicate(
      "byStatus.averageResolutionTimeSeconds is non-negative",
      statusRow.averageResolutionTimeSeconds >= 0,
    );
  }

  // 8. Validate timeSeries buckets: valid ordering and non-negative counters
  for (const bucket of analytics.timeSeries) {
    const timeBucket: IShoppingMallReviewModerationTimeBucket = bucket;
    typia.assert<IShoppingMallReviewModerationTimeBucket>(timeBucket);

    const bucketStartMs = Date.parse(timeBucket.bucketStart);
    const bucketEndMs = Date.parse(timeBucket.bucketEnd);

    TestValidator.predicate(
      "timeSeries.bucketStart must be valid date-time",
      () => !Number.isNaN(bucketStartMs),
    );
    TestValidator.predicate(
      "timeSeries.bucketEnd must be valid date-time",
      () => !Number.isNaN(bucketEndMs),
    );
    TestValidator.predicate(
      "timeSeries.bucketStart must not be after bucketEnd",
      () => bucketStartMs <= bucketEndMs,
    );

    TestValidator.predicate(
      "timeSeries.reportCount is non-negative",
      timeBucket.reportCount >= 0,
    );
    TestValidator.predicate(
      "timeSeries.resolvedReportCount is non-negative",
      timeBucket.resolvedReportCount >= 0,
    );
    TestValidator.predicate(
      "timeSeries.moderationActionCount is non-negative",
      timeBucket.moderationActionCount >= 0,
    );
  }
}
