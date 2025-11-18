import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAnalyticsTimeGranularity } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsTimeGranularity";
import type { IAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsTimeRange";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IReviewModerationFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewModerationFilter";
import type { IReviewModerationState } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewModerationState";
import type { IReviewRatingFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewRatingFilter";
import type { IReviewVolumeDimensionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewVolumeDimensionType";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallReviewVolumeAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVolumeAnalytics";

/**
 * Validate seller-by-week review volume analytics with time buckets.
 *
 * Business goal
 *
 * - Ensure that the admin-facing review volume analytics endpoint can aggregate
 *   review statistics grouped by seller and segmented into weekly time buckets
 *   over a multi-week window.
 * - Confirm that the server respects the requested time granularity and dimension
 *   configuration and returns structurally consistent
 *   IShoppingMallReviewVolumeAnalytics data.
 *
 * Steps
 *
 * 1. Admin bootstrap and authentication
 *
 *    - Call POST /auth/admin/join (api.functional.auth.admin.join) with a randomly
 *         generated IShoppingMallAdminJoin.ICreate payload to obtain an
 *         IShoppingMallAdmin.IAuthorized response.
 *    - Rely on the SDK to inject the Authorization header into the shared connection
 *         automatically; do not touch connection.headers manually.
 * 2. Build review volume analytics request
 *
 *    - Define an IAnalyticsTimeRange covering roughly the last 8 weeks from “now”.
 *         Use concrete ISO 8601 date-time strings generated via Date and
 *         toISOString(), ensuring `from` is earlier than `to`.
 *    - Set IAnalyticsTimeGranularity to "week".
 *    - Configure IShoppingMallReviewVolumeAnalytics.ILineDimension as: { type:
 *         "seller", includeTimeBuckets: true }.
 *    - Do not set ratingFilter and moderationFilter, so all reviews are counted.
 *    - Set includeDerivedKpis to true to ask the server to compute optional KPI
 *         fields when available.
 * 3. Call PATCH /shoppingMall/admin/analytics/reviews/volume
 *
 *    - Invoke api.functional.shoppingMall.admin.analytics.reviews.volume.index with
 *         the constructed IRequest body.
 *    - Receive an IShoppingMallReviewVolumeAnalytics result and validate it with
 *         typia.assert to guarantee structural correctness.
 * 4. Validate top-level analytics configuration echo
 *
 *    - Assert via TestValidator.equals that:
 *
 *         - Output.timeGranularity equals "week" (the requested IAnalyticsTimeGranularity
 *                   value).
 *         - Output.dimension.type equals "seller".
 *         - Output.dimension.includeTimeBuckets is either true or undefined treated as
 *                   “no explicit opt-out”, but if it is present it must be
 *                   true.
 * 5. Per-line structural and business validations
 *
 *    - For each IShoppingMallReviewVolumeAnalytics.ILine in output.lines:
 *
 *         - DimensionType must equal "seller".
 *         - SellerId must be non-null and non-undefined.
 *         - TimeBucket should be a non-null, non-empty string (since we requested
 *                   includeTimeBuckets: true with weekly granularity).
 *         - TotalReviewCount, rating1Count..rating5Count must all be
 *
 * > = 0. - TotalReviewCount must be greater than or equal to the sum of
 * > rating1Count..rating5Count (because some reviews could be missing rating, but
 * > never negative over-count).
 *
 * 6. Cross-bucket / cross-seller behavior
 *
 *    - If output.lines has at least 2 entries:
 *
 *         - Ensure there exists at least one sellerId that appears on more than one line,
 *                   and where those lines have distinct timeBucket values,
 *                   demonstrating seller x week segmentation.
 *         - If such a seller is found, additionally assert that the timeBucket values for
 *                   that seller are not all identical.
 *    - If the dataset is too sparse (e.g., 0 or 1 lines only), skip the cross-bucket
 *         expectation while still asserting structural invariants.
 * 7. No type-error testing or HTTP status code inspection
 *
 *    - Do not attempt to send invalid types or omit required fields. All request
 *         bodies must satisfy their DTO types using satisfies.
 *    - Do not inspect specific HTTP status codes; rely on the SDK to throw on
 *         failure and typia.assert for structural checks.
 */
export async function test_api_admin_review_volume_analytics_by_seller_with_time_buckets(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap and authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Build review volume analytics request
  const now = new Date();
  const eightWeeksInMs = 8 * 7 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - eightWeeksInMs);

  const timeRange: IAnalyticsTimeRange = {
    from: fromDate.toISOString(),
    to: now.toISOString(),
  };

  const timeGranularity: IAnalyticsTimeGranularity = "week";

  const dimension: IShoppingMallReviewVolumeAnalytics.ILineDimension = {
    type: "seller",
    includeTimeBuckets: true,
  };

  const requestBody = {
    timeRange,
    timeGranularity,
    dimension,
    includeDerivedKpis: true,
  } satisfies IShoppingMallReviewVolumeAnalytics.IRequest;

  // 3. Call PATCH /shoppingMall/admin/analytics/reviews/volume
  const analytics: IShoppingMallReviewVolumeAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.volume.index(
      connection,
      { body: requestBody },
    );
  typia.assert(analytics);

  // 4. Validate top-level analytics configuration echo
  TestValidator.equals(
    "time granularity should be week",
    analytics.timeGranularity,
    timeGranularity,
  );

  TestValidator.equals(
    "dimension type should be seller",
    analytics.dimension.type,
    dimension.type,
  );

  if (analytics.dimension.includeTimeBuckets !== undefined) {
    TestValidator.equals(
      "includeTimeBuckets should be true when present",
      analytics.dimension.includeTimeBuckets,
      true,
    );
  }

  // 5. Per-line structural and business validations
  await ArrayUtil.asyncForEach(analytics.lines, async (line) => {
    TestValidator.equals(
      "each line dimensionType should be seller",
      line.dimensionType,
      "seller",
    );

    TestValidator.predicate(
      "sellerId must be non-null when dimensionType is seller",
      line.sellerId !== null && line.sellerId !== undefined,
    );

    TestValidator.predicate(
      "timeBucket should be non-null, non-empty string when time buckets are included",
      line.timeBucket !== null &&
        line.timeBucket !== undefined &&
        line.timeBucket.length > 0,
    );

    TestValidator.predicate(
      "totalReviewCount must be non-negative",
      line.totalReviewCount >= 0,
    );
    TestValidator.predicate(
      "rating1Count must be non-negative",
      line.rating1Count >= 0,
    );
    TestValidator.predicate(
      "rating2Count must be non-negative",
      line.rating2Count >= 0,
    );
    TestValidator.predicate(
      "rating3Count must be non-negative",
      line.rating3Count >= 0,
    );
    TestValidator.predicate(
      "rating4Count must be non-negative",
      line.rating4Count >= 0,
    );
    TestValidator.predicate(
      "rating5Count must be non-negative",
      line.rating5Count >= 0,
    );

    const sumRatings =
      line.rating1Count +
      line.rating2Count +
      line.rating3Count +
      line.rating4Count +
      line.rating5Count;

    TestValidator.predicate(
      "totalReviewCount should be >= sum of rating counts",
      line.totalReviewCount >= sumRatings,
    );
  });

  // 6. Cross-bucket / cross-seller behavior
  if (analytics.lines.length >= 2) {
    const sellerBuckets = new Map<string, Set<string>>();

    for (const line of analytics.lines) {
      if (line.sellerId === null || line.sellerId === undefined) continue;
      if (line.timeBucket === null || line.timeBucket === undefined) continue;

      const sellerId = line.sellerId;
      const bucket = line.timeBucket;

      const existing = sellerBuckets.get(sellerId) ?? new Set<string>();
      existing.add(bucket);
      sellerBuckets.set(sellerId, existing);
    }

    const sellersWithMultipleBuckets: string[] = [];
    for (const [sellerId, buckets] of sellerBuckets.entries()) {
      if (buckets.size > 1) sellersWithMultipleBuckets.push(sellerId);
    }

    if (sellerBuckets.size > 0) {
      TestValidator.predicate(
        "at least one seller should appear in multiple time buckets when data is rich enough",
        sellersWithMultipleBuckets.length > 0 || analytics.lines.length < 3,
      );
    }
  }
}
