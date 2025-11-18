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
 * Validate that an authenticated admin can retrieve overall review moderation
 * analytics using default server settings (no explicit filters) and that the
 * response conforms to IShoppingMallReviewModerationAnalytics and nested DTOs.
 *
 * 1. Create an admin via POST /auth/admin/join to obtain
 *    IShoppingMallAdmin.IAuthorized and configure the connection with an
 *    Authorization header.
 * 2. Call PATCH /shoppingMall/admin/analytics/reviews/moderation with an empty
 *    IRequest body so the server applies its default time range and grouping.
 * 3. Assert that the response type matches IShoppingMallReviewModerationAnalytics.
 * 4. Verify structural invariants:
 *
 *    - TimeRange has from/to as non-empty ISO date-time strings.
 *    - Totals numeric fields are all non-negative.
 *    - ByStatus, byReason, byModerator, bySeller, timeSeries are present arrays.
 * 5. For each element in the breakdown arrays, assert its DTO type and ensure
 *    basic numeric metrics are non-negative and required string/summary fields
 *    are non-empty.
 */
export async function test_api_admin_review_moderation_analytics_overall_totals(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Call moderation analytics with default settings (empty IRequest)
  const analytics: IShoppingMallReviewModerationAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.moderation.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert<IShoppingMallReviewModerationAnalytics>(analytics);

  // 3. Basic structural validations on timeRange
  TestValidator.predicate(
    "analytics.timeRange.from is a non-empty string",
    typeof analytics.timeRange.from === "string" &&
      analytics.timeRange.from.length > 0,
  );
  TestValidator.predicate(
    "analytics.timeRange.to is a non-empty string",
    typeof analytics.timeRange.to === "string" &&
      analytics.timeRange.to.length > 0,
  );

  // 4. Validate totals metrics are non-negative
  const totals: IShoppingMallReviewModerationTotals = analytics.totals;
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
    "totals.averageResolutionTimeSeconds is non-negative",
    totals.averageResolutionTimeSeconds >= 0,
  );
  TestValidator.predicate(
    "totals.helpfulVotes is non-negative",
    totals.helpfulVotes >= 0,
  );
  TestValidator.predicate(
    "totals.netHelpfulScore is non-negative",
    totals.netHelpfulScore >= 0,
  );

  // 5. Validate arrays exist and are arrays
  TestValidator.predicate(
    "analytics.byStatus is an array",
    Array.isArray(analytics.byStatus),
  );
  TestValidator.predicate(
    "analytics.byReason is an array",
    Array.isArray(analytics.byReason),
  );
  TestValidator.predicate(
    "analytics.byModerator is an array",
    Array.isArray(analytics.byModerator),
  );
  TestValidator.predicate(
    "analytics.bySeller is an array",
    Array.isArray(analytics.bySeller),
  );
  TestValidator.predicate(
    "analytics.timeSeries is an array",
    Array.isArray(analytics.timeSeries),
  );

  // Helper to validate non-negative int32-like counts
  const assertNonNegativeInt = (title: string, value: number): void => {
    TestValidator.predicate(title, Number.isFinite(value) && value >= 0);
  };

  // 6. byStatus breakdown validation
  for (const statusBucket of analytics.byStatus) {
    typia.assert<IShoppingMallReviewModerationByStatus>(statusBucket);
    TestValidator.predicate(
      "byStatus.status is non-empty string",
      typeof statusBucket.status === "string" && statusBucket.status.length > 0,
    );
    assertNonNegativeInt(
      "byStatus.reportCount is non-negative",
      statusBucket.reportCount,
    );
    assertNonNegativeInt(
      "byStatus.reviewCount is non-negative",
      statusBucket.reviewCount,
    );
    TestValidator.predicate(
      "byStatus.averageResolutionTimeSeconds is non-negative",
      statusBucket.averageResolutionTimeSeconds >= 0,
    );
  }

  // 7. byReason breakdown validation
  for (const reasonBucket of analytics.byReason) {
    typia.assert<IShoppingMallReviewModerationByReason>(reasonBucket);
    TestValidator.predicate(
      "byReason.reasonCode is non-empty string",
      typeof reasonBucket.reasonCode === "string" &&
        reasonBucket.reasonCode.length > 0,
    );
    assertNonNegativeInt(
      "byReason.reportCount is non-negative",
      reasonBucket.reportCount,
    );
    assertNonNegativeInt(
      "byReason.resolvedReportCount is non-negative",
      reasonBucket.resolvedReportCount,
    );
    TestValidator.predicate(
      "byReason.averageResolutionTimeSeconds is non-negative",
      reasonBucket.averageResolutionTimeSeconds >= 0,
    );
  }

  // 8. byModerator breakdown validation
  for (const moderatorBucket of analytics.byModerator) {
    typia.assert<IShoppingMallReviewModerationByModerator>(moderatorBucket);
    TestValidator.predicate(
      "byModerator.adminId is non-empty string",
      typeof moderatorBucket.adminId === "string" &&
        moderatorBucket.adminId.length > 0,
    );
    assertNonNegativeInt(
      "byModerator.handledReportCount is non-negative",
      moderatorBucket.handledReportCount,
    );
    assertNonNegativeInt(
      "byModerator.moderationActionCount is non-negative",
      moderatorBucket.moderationActionCount,
    );
    TestValidator.predicate(
      "byModerator.averageResolutionTimeSeconds is non-negative",
      moderatorBucket.averageResolutionTimeSeconds >= 0,
    );
  }

  // 9. bySeller breakdown validation
  for (const sellerBucket of analytics.bySeller) {
    typia.assert<IShoppingMallReviewModerationBySeller>(sellerBucket);
    typia.assert<IShoppingMallSeller.ISummary>(sellerBucket.seller);
    TestValidator.predicate(
      "bySeller.seller.id is non-empty string",
      typeof sellerBucket.seller.id === "string" &&
        sellerBucket.seller.id.length > 0,
    );
    assertNonNegativeInt(
      "bySeller.reportedReviewCount is non-negative",
      sellerBucket.reportedReviewCount,
    );
    assertNonNegativeInt(
      "bySeller.reportCount is non-negative",
      sellerBucket.reportCount,
    );
    assertNonNegativeInt(
      "bySeller.moderationActionCount is non-negative",
      sellerBucket.moderationActionCount,
    );
  }

  // 10. timeSeries breakdown validation
  for (const bucket of analytics.timeSeries) {
    typia.assert<IShoppingMallReviewModerationTimeBucket>(bucket);
    TestValidator.predicate(
      "timeSeries.bucketStart is non-empty string",
      typeof bucket.bucketStart === "string" && bucket.bucketStart.length > 0,
    );
    TestValidator.predicate(
      "timeSeries.bucketEnd is non-empty string",
      typeof bucket.bucketEnd === "string" && bucket.bucketEnd.length > 0,
    );
    assertNonNegativeInt(
      "timeSeries.reportCount is non-negative",
      bucket.reportCount,
    );
    assertNonNegativeInt(
      "timeSeries.resolvedReportCount is non-negative",
      bucket.resolvedReportCount,
    );
    assertNonNegativeInt(
      "timeSeries.moderationActionCount is non-negative",
      bucket.moderationActionCount,
    );
  }
}
