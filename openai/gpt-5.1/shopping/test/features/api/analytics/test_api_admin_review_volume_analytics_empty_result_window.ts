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

export async function test_api_admin_review_volume_analytics_empty_result_window(
  connection: api.IConnection,
) {
  /**
   * Validate review volume analytics for an empty time window.
   *
   * Business goal
   *
   * - Ensure that the admin review volume analytics endpoint returns a
   *   structurally valid IShoppingMallReviewVolumeAnalytics response when the
   *   requested time range contains no reviews.
   * - Focus is on stability and consistent response shape, not on non-zero
   *   aggregates.
   *
   * Steps
   *
   * 1. Register an admin using POST /auth/admin/join, which both creates the admin
   *    and configures the connection's Authorization header.
   * 2. Build a future 7-day time window (from now+7d to now+14d) that should have
   *    no reviews in typical test environments.
   * 3. Call PATCH /shoppingMall/admin/analytics/reviews/volume with:
   *
   *    - TimeRange: that future window
   *    - TimeGranularity: "day"
   *    - Dimension: { type: "time", includeTimeBuckets: true }
   *    - RatingFilter: omitted
   *    - ModerationFilter: omitted
   *    - IncludeDerivedKpis: false
   * 4. Assert that the endpoint returns a IShoppingMallReviewVolumeAnalytics
   *    object.
   * 5. Validate that:
   *
   *    - TimeGranularity echoes the requested granularity.
   *    - Dimension.type is "time" and includeTimeBuckets is truthy when specified.
   *    - Lines is either empty or consists only of zero-count buckets
   *         (totalReviewCount and rating1..rating5 all zero).
   *    - GeneratedAt is a non-empty date-time string.
   */

  // 1. Register an admin (authentication prerequisite)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Construct a future 7-day time window
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() + sevenDaysMs);
  const toDate = new Date(fromDate.getTime() + sevenDaysMs);

  const timeRange = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  } satisfies IAnalyticsTimeRange;

  const timeGranularity: IAnalyticsTimeGranularity = "day";
  const dimension = {
    type: "time" as IReviewVolumeDimensionType,
    includeTimeBuckets: true,
  } satisfies IShoppingMallReviewVolumeAnalytics.ILineDimension;

  const body = {
    timeRange,
    timeGranularity,
    dimension,
    includeDerivedKpis: false,
  } satisfies IShoppingMallReviewVolumeAnalytics.IRequest;

  // 3. Call the analytics endpoint
  const analytics: IShoppingMallReviewVolumeAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.volume.index(
      connection,
      { body },
    );
  typia.assert(analytics);

  // 4. Validate top-level invariants
  TestValidator.equals(
    "timeGranularity echoes request",
    analytics.timeGranularity,
    timeGranularity,
  );

  TestValidator.equals(
    "dimension.type is 'time'",
    analytics.dimension.type,
    dimension.type,
  );

  TestValidator.predicate(
    "generatedAt is a non-empty string",
    typeof analytics.generatedAt === "string" &&
      analytics.generatedAt.length > 0,
  );

  // 5. Validate lines represent an empty dataset consistently
  const lines = analytics.lines;

  if (lines.length === 0) {
    TestValidator.equals(
      "lines may be empty when there is no data",
      lines.length,
      0,
    );
    return;
  }

  for (const line of lines) {
    TestValidator.equals(
      "line.dimensionType is 'time'",
      line.dimensionType,
      dimension.type,
    );

    TestValidator.predicate(
      "timeBucket is string or null/undefined",
      line.timeBucket === null ||
        line.timeBucket === undefined ||
        typeof line.timeBucket === "string",
    );

    TestValidator.equals(
      "totalReviewCount is zero in empty window",
      line.totalReviewCount,
      0,
    );
    TestValidator.equals(
      "rating1Count is zero in empty window",
      line.rating1Count,
      0,
    );
    TestValidator.equals(
      "rating2Count is zero in empty window",
      line.rating2Count,
      0,
    );
    TestValidator.equals(
      "rating3Count is zero in empty window",
      line.rating3Count,
      0,
    );
    TestValidator.equals(
      "rating4Count is zero in empty window",
      line.rating4Count,
      0,
    );
    TestValidator.equals(
      "rating5Count is zero in empty window",
      line.rating5Count,
      0,
    );
  }
}
