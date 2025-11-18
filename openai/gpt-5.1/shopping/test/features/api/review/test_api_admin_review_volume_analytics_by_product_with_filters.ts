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
 * Validate admin review volume analytics grouped by product with rating and
 * moderation filters.
 *
 * Business intent:
 *
 * - An authenticated admin can request aggregated review volume analytics grouped
 *   by product, filtered to high ratings (4-5) and visible reviews only.
 * - The analytics service returns lines whose dimensionType is "product", with
 *   productId populated, and rating distribution plus derived KPIs.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join (api.functional.auth.admin.join).
 * 2. Build a 30-day timeRange ending "now" in ISO 8601.
 * 3. Call PATCH /shoppingMall/admin/analytics/reviews/volume with:
 *
 *    - TimeRange: last 30 days
 *    - TimeGranularity: "day"
 *    - Dimension: { type: "product", includeTimeBuckets: false }
 *    - RatingFilter: { minRating: 4, maxRating: 5 }
 *    - ModerationFilter: { visibilityStatuses: ["visible"] }
 *    - IncludeDerivedKpis: true
 * 4. Assert the response structure and basic invariants on lines.
 */
export async function test_api_admin_review_volume_analytics_by_product_with_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin and let SDK set Authorization header automatically.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Build a 30-day timeRange ending now.
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - thirtyDaysMs);
  const timeRange: IAnalyticsTimeRange = {
    from: fromDate.toISOString() as string & tags.Format<"date-time">,
    to: now.toISOString() as string & tags.Format<"date-time">,
  };

  const timeGranularity: IAnalyticsTimeGranularity = "day";
  const dimensionType: IReviewVolumeDimensionType = "product";

  const ratingFilter: IReviewRatingFilter = {
    minRating: 4 as number & tags.Type<"int32">,
    maxRating: 5 as number & tags.Type<"int32">,
  };

  const moderationFilter: IReviewModerationFilter = {
    visibilityStatuses: ["visible"],
  };

  const requestBody = {
    timeRange,
    timeGranularity,
    dimension: {
      type: dimensionType,
      includeTimeBuckets: false,
    },
    ratingFilter,
    moderationFilter,
    includeDerivedKpis: true,
  } satisfies IShoppingMallReviewVolumeAnalytics.IRequest;

  // 3. Call analytics endpoint.
  const analytics: IShoppingMallReviewVolumeAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.volume.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallReviewVolumeAnalytics>(analytics);

  // 4. Validate high-level configuration echoes.
  TestValidator.equals(
    "dimension type must be product",
    analytics.dimension.type,
    "product" satisfies IReviewVolumeDimensionType,
  );

  TestValidator.equals(
    "includeTimeBuckets must be false when requesting product-only grouping",
    analytics.dimension.includeTimeBuckets ?? false,
    false,
  );

  TestValidator.equals(
    "timeGranularity must echo request as day",
    analytics.timeGranularity,
    "day" satisfies IAnalyticsTimeGranularity,
  );

  // 5. Iterate over lines and check invariants.
  for (const line of analytics.lines) {
    // 5-1. Dimension type and productId presence.
    TestValidator.equals(
      "line dimensionType must be product",
      line.dimensionType,
      "product" satisfies IReviewVolumeDimensionType,
    );

    TestValidator.predicate(
      "line.productId must be non-null for product dimension",
      line.productId !== null && line.productId !== undefined,
    );

    // 5-2. Rating counts and totalReviewCount consistency.
    const totalReviewCount = line.totalReviewCount;
    const rating1 = line.rating1Count;
    const rating2 = line.rating2Count;
    const rating3 = line.rating3Count;
    const rating4 = line.rating4Count;
    const rating5 = line.rating5Count;

    const sumRatings = rating1 + rating2 + rating3 + rating4 + rating5;

    TestValidator.equals(
      "totalReviewCount equals sum of rating1..rating5",
      totalReviewCount,
      sumRatings,
    );

    TestValidator.predicate(
      "all rating counts must be non-negative",
      rating1 >= 0 &&
        rating2 >= 0 &&
        rating3 >= 0 &&
        rating4 >= 0 &&
        rating5 >= 0,
    );

    const positiveHighRatings = rating4 + rating5;

    TestValidator.predicate(
      "sum of rating4Count and rating5Count cannot exceed totalReviewCount",
      positiveHighRatings <= totalReviewCount,
    );

    // 5-3. Derived KPIs are null or non-negative.
    if (line.reviewsPerOrder !== null && line.reviewsPerOrder !== undefined) {
      TestValidator.predicate(
        "reviewsPerOrder must be non-negative when defined",
        line.reviewsPerOrder >= 0,
      );
    }

    if (
      line.reviewsPerActiveCustomer !== null &&
      line.reviewsPerActiveCustomer !== undefined
    ) {
      TestValidator.predicate(
        "reviewsPerActiveCustomer must be non-negative when defined",
        line.reviewsPerActiveCustomer >= 0,
      );
    }
  }
}
