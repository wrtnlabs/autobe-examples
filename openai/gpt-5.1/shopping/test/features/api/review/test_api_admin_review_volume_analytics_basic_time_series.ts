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

export async function test_api_admin_review_volume_analytics_basic_time_series(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional; omit to let backend infer from request metadata
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 2. Build a 7-day time range ending now
  const now = new Date();
  const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const requestTimeRange: IAnalyticsTimeRange = {
    from: fromDate.toISOString() as string & tags.Format<"date-time">,
    to: now.toISOString() as string & tags.Format<"date-time">,
  };

  // 3. Prepare basic IRequest body for review volume analytics
  const requestBody = {
    timeRange: requestTimeRange,
    timeGranularity: "day" as IAnalyticsTimeGranularity,
    dimension: {
      type: "time" as IReviewVolumeDimensionType,
      includeTimeBuckets: true,
    },
    includeDerivedKpis: false,
  } satisfies IShoppingMallReviewVolumeAnalytics.IRequest;

  // 4. Call analytics endpoint
  const analytics: IShoppingMallReviewVolumeAnalytics =
    await api.functional.shoppingMall.admin.analytics.reviews.volume.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallReviewVolumeAnalytics>(analytics);

  // 5. Validate top-level analytics metadata
  TestValidator.equals(
    "timeGranularity echoes request",
    analytics.timeGranularity,
    requestBody.timeGranularity,
  );

  TestValidator.equals(
    "dimension type is time",
    analytics.dimension.type,
    requestBody.dimension.type,
  );

  TestValidator.predicate(
    "dimension.includeTimeBuckets is true",
    analytics.dimension.includeTimeBuckets === true,
  );

  const reqFrom = new Date(requestBody.timeRange.from);
  const reqTo = new Date(requestBody.timeRange.to);
  const resFrom = new Date(analytics.timeRange.from);
  const resTo = new Date(analytics.timeRange.to);

  TestValidator.predicate(
    "response time range is ordered",
    resFrom.getTime() <= resTo.getTime(),
  );

  TestValidator.predicate(
    "response time range covers requested window (from)",
    resFrom.getTime() <= reqFrom.getTime(),
  );

  TestValidator.predicate(
    "response time range covers requested window (to)",
    resTo.getTime() >= reqTo.getTime(),
  );

  // 6. Validate lines array and per-line constraints
  for (const line of analytics.lines) {
    TestValidator.equals(
      "line.dimensionType matches time dimension",
      line.dimensionType,
      "time" as IReviewVolumeDimensionType,
    );

    if (analytics.dimension.includeTimeBuckets === true) {
      TestValidator.predicate(
        "timeBucket is present when time buckets are included",
        line.timeBucket !== null && line.timeBucket !== undefined,
      );
    }

    TestValidator.predicate(
      "totalReviewCount is non-negative",
      line.totalReviewCount >= 0,
    );
    TestValidator.predicate(
      "rating1Count is non-negative",
      line.rating1Count >= 0,
    );
    TestValidator.predicate(
      "rating2Count is non-negative",
      line.rating2Count >= 0,
    );
    TestValidator.predicate(
      "rating3Count is non-negative",
      line.rating3Count >= 0,
    );
    TestValidator.predicate(
      "rating4Count is non-negative",
      line.rating4Count >= 0,
    );
    TestValidator.predicate(
      "rating5Count is non-negative",
      line.rating5Count >= 0,
    );

    if (
      line.totalReviewCount > 0 &&
      line.averageRating !== null &&
      line.averageRating !== undefined
    ) {
      TestValidator.predicate(
        "averageRating within 1–5 when reviews exist",
        line.averageRating >= 1 && line.averageRating <= 5,
      );
    }
  }

  // 7. Optionally check generatedAt recency (within 60 seconds)
  const generatedAt = new Date(analytics.generatedAt);
  const nowAfter = new Date();
  const diffMs = Math.abs(nowAfter.getTime() - generatedAt.getTime());

  TestValidator.predicate(
    "generatedAt is recent (within 60s)",
    diffMs <= 60_000,
  );
}
