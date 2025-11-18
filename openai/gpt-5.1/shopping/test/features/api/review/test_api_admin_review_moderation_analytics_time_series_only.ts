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
 * Validate time-series-only review moderation analytics for admin dashboards.
 *
 * ## Business goal
 *
 * Ensure that an authenticated admin can call the review moderation analytics
 * endpoint with a configuration that only specifies a time range and a
 * time-based grouping, and still receive a coherent time-series representation
 * of moderation workload.
 *
 * This test focuses on the "pure time-series" use case where the client cares
 * primarily about bucketed daily metrics and leaves other filters at their
 * defaults.
 *
 * ## Steps
 *
 * 1. Create and authenticate an admin via POST /auth/admin/join so that subsequent
 *    calls use an authorized admin context.
 * 2. Build an IShoppingMallReviewModerationAnalytics.IRequest that:
 *
 *    - Covers the last 14 days using from/to ISO date-time strings,
 *    - Sets groupBy to ["time"], and
 *    - Sets timeBucket to "day", while omitting all other optional filters.
 * 3. Call PATCH /shoppingMall/admin/analytics/reviews/moderation with this
 *    request.
 * 4. Assert the response type using typia.assert to guarantee it satisfies
 *    IShoppingMallReviewModerationAnalytics.
 * 5. Perform additional invariants checks:
 *
 *    - TimeRange.from < timeRange.to
 *    - TimeSeries buckets are ordered chronologically by bucketStart and each
 *         bucketStart < bucketEnd.
 *    - ReportCount, resolvedReportCount, moderationActionCount in each bucket are
 *         non-negative.
 *    - Totals and all grouped breakdowns exist and have non-negative counts and
 *         averageResolutionTimeSeconds.
 *    - The sum of reportCount across timeSeries is non-negative and at least as
 *         large as 0, and totals.reportedReviews is non-negative. We avoid
 *         asserting strong equality relationships because the exact semantics
 *         between totals and time series can vary.
 * 6. Handle the case where analytics returns empty arrays gracefully: the
 *    invariants above should still hold vacuously (for ordering) or as simple
 *    non-negativity checks.
 */
export async function test_api_admin_review_moderation_analytics_time_series_only(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin to gain access to admin analytics.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional ip left undefined to let backend derive from request context.
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. Build a time-series-only analytics request for the last 14 days.
  const now = new Date();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - fourteenDaysMs);
  const fromIso = fromDate.toISOString();
  const toIso = now.toISOString();

  const requestBody = {
    from: fromIso,
    to: toIso,
    groupBy: ["time"],
    timeBucket: "day",
  } satisfies IShoppingMallReviewModerationAnalytics.IRequest;

  // 3. Call the moderation analytics endpoint.
  const analytics =
    await api.functional.shoppingMall.admin.analytics.reviews.moderation.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallReviewModerationAnalytics>(analytics);

  const timeRange: IShoppingMallAnalyticsTimeRange = analytics.timeRange;
  const totals: IShoppingMallReviewModerationTotals = analytics.totals;
  const byStatus: IShoppingMallReviewModerationByStatus[] = analytics.byStatus;
  const byReason: IShoppingMallReviewModerationByReason[] = analytics.byReason;
  const byModerator: IShoppingMallReviewModerationByModerator[] =
    analytics.byModerator;
  const bySeller: IShoppingMallReviewModerationBySeller[] = analytics.bySeller;
  const timeSeries: IShoppingMallReviewModerationTimeBucket[] =
    analytics.timeSeries;

  // 4. Basic timeRange invariants: from < to.
  const fromMillis = Date.parse(timeRange.from);
  const toMillis = Date.parse(timeRange.to);
  TestValidator.predicate(
    "timeRange.from must be earlier than timeRange.to",
    fromMillis < toMillis,
  );

  // 5. Validate that timeSeries buckets are ordered and internally consistent.
  for (let i = 0; i < timeSeries.length; i++) {
    const bucket = timeSeries[i];
    const start = Date.parse(bucket.bucketStart);
    const end = Date.parse(bucket.bucketEnd);

    TestValidator.predicate(
      `timeSeries[${i}].bucketStart must be earlier than bucketEnd`,
      start < end,
    );

    TestValidator.predicate(
      `timeSeries[${i}].reportCount must be non-negative`,
      bucket.reportCount >= 0,
    );
    TestValidator.predicate(
      `timeSeries[${i}].resolvedReportCount must be non-negative`,
      bucket.resolvedReportCount >= 0,
    );
    TestValidator.predicate(
      `timeSeries[${i}].moderationActionCount must be non-negative`,
      bucket.moderationActionCount >= 0,
    );

    if (i > 0) {
      const prev = timeSeries[i - 1];
      const prevEnd = Date.parse(prev.bucketEnd);

      TestValidator.predicate(
        `timeSeries must be ordered by bucketStart (index ${i})`,
        prevEnd <= start,
      );
    }
  }

  // 6. Totals invariants: all counts non-negative.
  TestValidator.predicate(
    "totals.totalReviews must be non-negative",
    totals.totalReviews >= 0,
  );
  TestValidator.predicate(
    "totals.reportedReviews must be non-negative",
    totals.reportedReviews >= 0,
  );
  TestValidator.predicate(
    "totals.openReports must be non-negative",
    totals.openReports >= 0,
  );
  TestValidator.predicate(
    "totals.resolvedReports must be non-negative",
    totals.resolvedReports >= 0,
  );
  TestValidator.predicate(
    "totals.moderationActions must be non-negative",
    totals.moderationActions >= 0,
  );
  TestValidator.predicate(
    "totals.averageResolutionTimeSeconds must be non-negative",
    totals.averageResolutionTimeSeconds >= 0,
  );
  TestValidator.predicate(
    "totals.helpfulVotes must be non-negative",
    totals.helpfulVotes >= 0,
  );
  TestValidator.predicate(
    "totals.netHelpfulScore must be non-negative",
    totals.netHelpfulScore >= 0,
  );

  // 7. Non-negativity invariants for grouped breakdowns.
  for (let i = 0; i < byStatus.length; i++) {
    const row = byStatus[i];
    TestValidator.predicate(
      `byStatus[${i}].reportCount must be non-negative`,
      row.reportCount >= 0,
    );
    TestValidator.predicate(
      `byStatus[${i}].reviewCount must be non-negative`,
      row.reviewCount >= 0,
    );
    TestValidator.predicate(
      `byStatus[${i}].averageResolutionTimeSeconds must be non-negative`,
      row.averageResolutionTimeSeconds >= 0,
    );
  }

  for (let i = 0; i < byReason.length; i++) {
    const row = byReason[i];
    TestValidator.predicate(
      `byReason[${i}].reportCount must be non-negative`,
      row.reportCount >= 0,
    );
    TestValidator.predicate(
      `byReason[${i}].resolvedReportCount must be non-negative`,
      row.resolvedReportCount >= 0,
    );
    TestValidator.predicate(
      `byReason[${i}].averageResolutionTimeSeconds must be non-negative`,
      row.averageResolutionTimeSeconds >= 0,
    );
  }

  for (let i = 0; i < byModerator.length; i++) {
    const row = byModerator[i];
    TestValidator.predicate(
      `byModerator[${i}].handledReportCount must be non-negative`,
      row.handledReportCount >= 0,
    );
    TestValidator.predicate(
      `byModerator[${i}].moderationActionCount must be non-negative`,
      row.moderationActionCount >= 0,
    );
    TestValidator.predicate(
      `byModerator[${i}].averageResolutionTimeSeconds must be non-negative`,
      row.averageResolutionTimeSeconds >= 0,
    );
  }

  for (let i = 0; i < bySeller.length; i++) {
    const row = bySeller[i];
    const seller: IShoppingMallSeller.ISummary = row.seller;
    // Validate seller summary formats using typia.assert and simple
    // non-emptiness checks for business realism.
    typia.assert<IShoppingMallSeller.ISummary>(seller);

    TestValidator.predicate(
      `bySeller[${i}].seller.id should be a non-empty UUID string`,
      seller.id.length > 0,
    );
    TestValidator.predicate(
      `bySeller[${i}].seller.email should be non-empty`,
      seller.email.length > 0,
    );

    TestValidator.predicate(
      `bySeller[${i}].reportedReviewCount must be non-negative`,
      row.reportedReviewCount >= 0,
    );
    TestValidator.predicate(
      `bySeller[${i}].reportCount must be non-negative`,
      row.reportCount >= 0,
    );
    TestValidator.predicate(
      `bySeller[${i}].moderationActionCount must be non-negative`,
      row.moderationActionCount >= 0,
    );
  }

  // 8. Aggregate consistency: sums over timeSeries must be non-negative and
  // consistent with trivial invariants.
  const aggregate = timeSeries.reduce(
    (acc, bucket) => {
      return {
        reportCount: acc.reportCount + bucket.reportCount,
        resolvedReportCount:
          acc.resolvedReportCount + bucket.resolvedReportCount,
        moderationActionCount:
          acc.moderationActionCount + bucket.moderationActionCount,
      };
    },
    { reportCount: 0, resolvedReportCount: 0, moderationActionCount: 0 },
  );

  TestValidator.predicate(
    "sum(timeSeries.reportCount) must be non-negative",
    aggregate.reportCount >= 0,
  );
  TestValidator.predicate(
    "sum(timeSeries.resolvedReportCount) must be non-negative",
    aggregate.resolvedReportCount >= 0,
  );
  TestValidator.predicate(
    "sum(timeSeries.moderationActionCount) must be non-negative",
    aggregate.moderationActionCount >= 0,
  );
}
