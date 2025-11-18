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
 * Validate moderation-focused, rating-filtered review volume analytics over a
 * time dimension.
 *
 * Business workflow:
 *
 * 1. Register an admin using POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. With the admin-authenticated connection, call PATCH
 *    /shoppingMall/admin/analytics/reviews/volume configured for a 14-day
 *    window, daily granularity, time dimension with time buckets, a low-rating
 *    filter [1,2,3], and a moderation filter targeting pending/hidden states.
 * 3. Verify that the endpoint returns a structurally correct
 *    IShoppingMallReviewVolumeAnalytics response, that the dimension type is
 *    "time", and every line is dimensioned by time and has non-negative rating
 *    counts whose sum matches totalReviewCount.
 *
 * This test does not assert that any reviews exist in the selected window, only
 * that the server accepts and consistently applies the requested filters, and
 * returns coherent aggregates when data is present.
 */
export async function test_api_admin_review_volume_analytics_moderation_filtered_segment(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Build a 14-day time range ending now.
  const now = new Date();
  const millisPerDay = 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - 14 * millisPerDay);
  const timeRange: IAnalyticsTimeRange = {
    from: fromDate.toISOString() as string & tags.Format<"date-time">,
    to: now.toISOString() as string & tags.Format<"date-time">,
  };

  const timeGranularity: IAnalyticsTimeGranularity = "day";
  const dimensionType: IReviewVolumeDimensionType = "time";

  const dimension: IShoppingMallReviewVolumeAnalytics.ILineDimension = {
    type: dimensionType,
    includeTimeBuckets: true,
  };

  const ratingFilter: IReviewRatingFilter = {
    allowedRatings: [1, 2, 3],
    minRating: null,
    maxRating: null,
  };

  const moderationStates: IReviewModerationState[] = [
    "pending_review",
    "under_review",
  ];

  const moderationFilter: IReviewModerationFilter = {
    visibilityStatuses: ["pending_moderation", "hidden"],
    moderationStates,
  };

  const requestBody = {
    timeRange,
    timeGranularity,
    dimension,
    ratingFilter,
    moderationFilter,
    includeDerivedKpis: false,
  } satisfies IShoppingMallReviewVolumeAnalytics.IRequest;

  // 3. Call the analytics endpoint.
  const analytics: IShoppingMallReviewVolumeAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.volume.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(analytics);

  // 4. Structural assertions on the response.
  TestValidator.equals(
    "analytics dimension type should be 'time'",
    analytics.dimension.type,
    "time",
  );

  if (analytics.dimension.includeTimeBuckets !== undefined) {
    TestValidator.predicate(
      "includeTimeBuckets, when present, should be truthy",
      !!analytics.dimension.includeTimeBuckets,
    );
  }

  // lines may be empty if no reviews fall into the filtered window.
  for (const line of analytics.lines) {
    TestValidator.equals(
      "each line dimensionType should be 'time'",
      line.dimensionType,
      "time",
    );

    // Non-negative counts.
    TestValidator.predicate(
      "totalReviewCount should be non-negative",
      line.totalReviewCount >= 0,
    );
    TestValidator.predicate(
      "rating1Count should be non-negative",
      line.rating1Count >= 0,
    );
    TestValidator.predicate(
      "rating2Count should be non-negative",
      line.rating2Count >= 0,
    );
    TestValidator.predicate(
      "rating3Count should be non-negative",
      line.rating3Count >= 0,
    );
    TestValidator.predicate(
      "rating4Count should be non-negative",
      line.rating4Count >= 0,
    );
    TestValidator.predicate(
      "rating5Count should be non-negative",
      line.rating5Count >= 0,
    );

    const sumRatings =
      line.rating1Count +
      line.rating2Count +
      line.rating3Count +
      line.rating4Count +
      line.rating5Count;

    TestValidator.equals(
      "totalReviewCount should equal sum of rating buckets",
      line.totalReviewCount,
      sumRatings,
    );

    TestValidator.predicate(
      "sum of rating buckets should not exceed totalReviewCount",
      sumRatings <= line.totalReviewCount,
    );
  }
}
