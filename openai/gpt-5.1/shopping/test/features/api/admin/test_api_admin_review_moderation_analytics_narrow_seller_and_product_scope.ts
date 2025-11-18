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

export async function test_api_admin_review_moderation_analytics_narrow_seller_and_product_scope(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Build a 90-day window
  const now = new Date();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - ninetyDaysMs);
  const toDate = now;

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  // 3. Build filtered moderation analytics request body
  const requestBody = {
    from: fromIso as string & tags.Format<"date-time">,
    to: toIso as string & tags.Format<"date-time">,
    sellerIds: [typia.random<string & tags.Format<"uuid">>()],
    productIds: [typia.random<string & tags.Format<"uuid">>()],
    groupBy: ["status", "seller", "time"],
    timeBucket: "week",
  } satisfies IShoppingMallReviewModerationAnalytics.IRequest;

  const analytics: IShoppingMallReviewModerationAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.moderation.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallReviewModerationAnalytics>(analytics);

  // 4. Validate timeRange
  const timeRange: IShoppingMallAnalyticsTimeRange = analytics.timeRange;
  typia.assert<IShoppingMallAnalyticsTimeRange>(timeRange);

  const requestedFromMs = fromDate.getTime();
  const requestedToMs = toDate.getTime();
  const actualFromMs = new Date(timeRange.from).getTime();
  const actualToMs = new Date(timeRange.to).getTime();

  TestValidator.predicate(
    "timeRange.from should be before or equal to timeRange.to",
    actualFromMs <= actualToMs,
  );

  const actualSpanMs = actualToMs - actualFromMs;
  const toleranceMs = 2 * 24 * 60 * 60 * 1000; // allow a couple days of clamping slack
  TestValidator.predicate(
    "timeRange span should not exceed requested 90 days by large margin",
    actualSpanMs <= ninetyDaysMs + toleranceMs,
  );

  // 5. Validate totals
  const totals: IShoppingMallReviewModerationTotals = analytics.totals;
  typia.assert<IShoppingMallReviewModerationTotals>(totals);

  const totalsNonNegative =
    totals.totalReviews >= 0 &&
    totals.reportedReviews >= 0 &&
    totals.openReports >= 0 &&
    totals.resolvedReports >= 0 &&
    totals.moderationActions >= 0 &&
    totals.averageResolutionTimeSeconds >= 0 &&
    totals.helpfulVotes >= 0 &&
    totals.netHelpfulScore >= 0;

  TestValidator.predicate(
    "totals numeric fields should be non-negative",
    totalsNonNegative,
  );

  TestValidator.predicate(
    "reportedReviews should be less than or equal to totalReviews",
    totals.reportedReviews <= totals.totalReviews,
  );

  TestValidator.predicate(
    "openReports + resolvedReports should be <= reportedReviews",
    totals.openReports + totals.resolvedReports <= totals.reportedReviews,
  );

  const int32FieldsAreIntegers =
    Number.isInteger(totals.totalReviews) &&
    Number.isInteger(totals.reportedReviews) &&
    Number.isInteger(totals.openReports) &&
    Number.isInteger(totals.resolvedReports) &&
    Number.isInteger(totals.moderationActions) &&
    Number.isInteger(totals.helpfulVotes) &&
    Number.isInteger(totals.netHelpfulScore);

  TestValidator.predicate(
    "totals int32-tagged fields should be integers",
    int32FieldsAreIntegers,
  );

  // 6. Validate byStatus breakdown
  const byStatus: IShoppingMallReviewModerationByStatus[] = analytics.byStatus;
  const totalStatusReportCount = byStatus.reduce(
    (sum, bucket) => sum + bucket.reportCount,
    0,
  );

  for (const bucket of byStatus) {
    typia.assert<IShoppingMallReviewModerationByStatus>(bucket);
    TestValidator.predicate(
      `byStatus[${bucket.status}] counts non-negative`,
      bucket.reportCount >= 0 &&
        bucket.reviewCount >= 0 &&
        bucket.averageResolutionTimeSeconds >= 0,
    );
    TestValidator.predicate(
      `byStatus[${bucket.status}] int32 fields are integers`,
      Number.isInteger(bucket.reportCount) &&
        Number.isInteger(bucket.reviewCount),
    );
  }

  TestValidator.predicate(
    "sum of byStatus.reportCount should be >= openReports + resolvedReports",
    totalStatusReportCount >= totals.openReports + totals.resolvedReports,
  );

  // 7. Validate byReason breakdown if present
  const byReason: IShoppingMallReviewModerationByReason[] = analytics.byReason;
  for (const bucket of byReason) {
    typia.assert<IShoppingMallReviewModerationByReason>(bucket);
    TestValidator.predicate(
      `byReason[${bucket.reasonCode}] counts non-negative`,
      bucket.reportCount >= 0 &&
        bucket.resolvedReportCount >= 0 &&
        bucket.averageResolutionTimeSeconds >= 0,
    );
    TestValidator.predicate(
      `byReason[${bucket.reasonCode}] resolvedReportCount <= reportCount`,
      bucket.resolvedReportCount <= bucket.reportCount,
    );
  }

  // 8. Validate byModerator breakdown if present
  const byModerator: IShoppingMallReviewModerationByModerator[] =
    analytics.byModerator;
  for (const bucket of byModerator) {
    typia.assert<IShoppingMallReviewModerationByModerator>(bucket);
    TestValidator.predicate(
      `byModerator[${bucket.adminId}] counts non-negative`,
      bucket.handledReportCount >= 0 &&
        bucket.moderationActionCount >= 0 &&
        bucket.averageResolutionTimeSeconds >= 0,
    );

    TestValidator.predicate(
      `byModerator[${bucket.adminId}] int32 fields are integers`,
      Number.isInteger(bucket.handledReportCount) &&
        Number.isInteger(bucket.moderationActionCount),
    );
  }

  // 9. Validate bySeller breakdown with focus on structural consistency
  const bySeller: IShoppingMallReviewModerationBySeller[] = analytics.bySeller;
  const aggregateBySellerId = new Map<
    string,
    {
      reportedReviewCount: number;
      reportCount: number;
      moderationActionCount: number;
    }
  >();

  for (const entry of bySeller) {
    typia.assert<IShoppingMallReviewModerationBySeller>(entry);

    const sellerSummary: IShoppingMallSeller.ISummary = entry.seller;
    typia.assert<IShoppingMallSeller.ISummary>(sellerSummary);

    // Validate seller.id format and counts
    const sellerId = sellerSummary.id;
    const isUuidLike = typeof sellerId === "string" && sellerId.length > 0; // typia already covers real UUID format

    TestValidator.predicate(
      `bySeller seller.id must be non-empty string`,
      isUuidLike,
    );

    TestValidator.predicate(
      `bySeller[${sellerId}] counts non-negative`,
      entry.reportedReviewCount >= 0 &&
        entry.reportCount >= 0 &&
        entry.moderationActionCount >= 0,
    );

    TestValidator.predicate(
      `bySeller[${sellerId}] int32 fields are integers`,
      Number.isInteger(entry.reportedReviewCount) &&
        Number.isInteger(entry.reportCount) &&
        Number.isInteger(entry.moderationActionCount),
    );

    const aggregated = aggregateBySellerId.get(sellerId) ?? {
      reportedReviewCount: 0,
      reportCount: 0,
      moderationActionCount: 0,
    };
    aggregated.reportedReviewCount += entry.reportedReviewCount;
    aggregated.reportCount += entry.reportCount;
    aggregated.moderationActionCount += entry.moderationActionCount;
    aggregateBySellerId.set(sellerId, aggregated);
  }

  for (const [sellerId, aggregated] of aggregateBySellerId.entries()) {
    TestValidator.predicate(
      `aggregated bySeller counts non-negative for seller ${sellerId}`,
      aggregated.reportedReviewCount >= 0 &&
        aggregated.reportCount >= 0 &&
        aggregated.moderationActionCount >= 0,
    );
  }

  // 10. Validate timeSeries buckets
  const timeSeries: IShoppingMallReviewModerationTimeBucket[] =
    analytics.timeSeries;

  let previousBucketEndMs: number | null = null;
  for (const bucket of timeSeries) {
    typia.assert<IShoppingMallReviewModerationTimeBucket>(bucket);

    const bucketStartMs = new Date(bucket.bucketStart).getTime();
    const bucketEndMs = new Date(bucket.bucketEnd).getTime();

    TestValidator.predicate(
      `timeSeries bucketStart < bucketEnd for ${bucket.bucketStart}`,
      bucketStartMs < bucketEndMs,
    );

    if (previousBucketEndMs !== null) {
      TestValidator.predicate(
        "timeSeries buckets should not overlap and be ordered by start time",
        previousBucketEndMs <= bucketStartMs,
      );
    }
    previousBucketEndMs = bucketEndMs;

    TestValidator.predicate(
      `timeSeries counts non-negative for bucket ${bucket.bucketStart}`,
      bucket.reportCount >= 0 &&
        bucket.resolvedReportCount >= 0 &&
        bucket.moderationActionCount >= 0,
    );

    TestValidator.predicate(
      `timeSeries int32 fields are integers for bucket ${bucket.bucketStart}`,
      Number.isInteger(bucket.reportCount) &&
        Number.isInteger(bucket.resolvedReportCount) &&
        Number.isInteger(bucket.moderationActionCount),
    );
  }
}
