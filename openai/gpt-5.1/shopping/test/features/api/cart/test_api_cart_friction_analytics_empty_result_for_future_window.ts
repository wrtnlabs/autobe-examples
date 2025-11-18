import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAnalyticsDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsDimensions";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallCartAbandonmentMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartAbandonmentMetrics";
import type { IShoppingMallCartCounts } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCounts";
import type { IShoppingMallCartFrictionAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartFrictionAnalytics";
import type { IShoppingMallCartFrictionAnalyticsOverall } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartFrictionAnalyticsOverall";
import type { IShoppingMallCartFrictionAnalyticsSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartFrictionAnalyticsSegment";
import type { IShoppingMallCartFrictionTimeSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartFrictionTimeSeries";
import type { IShoppingMallCartFrictionTimeSeriesBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartFrictionTimeSeriesBucket";
import type { IShoppingMallCartValidationFailureDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationFailureDistribution";
import type { IShoppingMallCartValidationFailureReasonBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationFailureReasonBucket";

export async function test_api_cart_friction_analytics_empty_result_for_future_window(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap & authentication via join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Build a future-only time range for analytics
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() + oneDayMs).toISOString();
  const to = new Date(now.getTime() + 2 * oneDayMs).toISOString();

  const timeRange = {
    from,
    to,
    bucket_granularity: "day",
  } satisfies IShoppingMallCartFrictionAnalytics.ITimeRange;

  const requestBody = {
    time_range: timeRange,
    segmentations: [],
    include_time_series: true,
    max_bucket_count: 5,
  } satisfies IShoppingMallCartFrictionAnalytics.IRequest;

  // 3. Call friction analytics endpoint
  const analytics: IShoppingMallCartFrictionAnalytics =
    await api.functional.shoppingMall.admin.carts.analytics.friction.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallCartFrictionAnalytics>(analytics);

  // 4. Basic structural sanity checks
  TestValidator.predicate(
    "analytics timeRange.from is in the future",
    () => new Date(analytics.timeRange.from).getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "analytics timeRange.to is after from",
    () =>
      new Date(analytics.timeRange.to).getTime() >
      new Date(analytics.timeRange.from).getTime(),
  );

  // 5. Overall counts should be zero in a future-only window
  const overall = analytics.overall;
  const carts = overall.carts;
  const abandonment = overall.abandonment;
  const failures = overall.validationFailures;

  TestValidator.equals(
    "overall.carts.totalCarts should be 0 for future-only window",
    carts.totalCarts,
    0,
  );
  TestValidator.equals(
    "overall.carts.activeCarts should be 0 for future-only window",
    carts.activeCarts,
    0,
  );
  TestValidator.equals(
    "overall.carts.cartsReachedCheckout should be 0 for future-only window",
    carts.cartsReachedCheckout,
    0,
  );
  TestValidator.equals(
    "overall.carts.averageItemsPerCart should be 0 for future-only window",
    carts.averageItemsPerCart,
    0,
  );

  TestValidator.equals(
    "overall.abandonment.cartAbandonmentRate should be 0 when no carts exist",
    abandonment.cartAbandonmentRate,
    0,
  );
  TestValidator.equals(
    "overall.abandonment.averageTimeToCheckoutSeconds should be 0 when no carts exist",
    abandonment.averageTimeToCheckoutSeconds,
    0,
  );
  TestValidator.equals(
    "overall.abandonment.abandonedBeforeCheckoutCount should be 0 when no carts exist",
    abandonment.abandonedBeforeCheckoutCount,
    0,
  );
  TestValidator.equals(
    "overall.abandonment.abandonedDuringCheckoutCount should be 0 when no carts exist",
    abandonment.abandonedDuringCheckoutCount,
    0,
  );

  TestValidator.equals(
    "overall.validationFailures.totalValidationFailures should be 0 when no carts exist",
    failures.totalValidationFailures,
    0,
  );
  TestValidator.equals(
    "overall.validationFailures.byReason should be empty when no carts exist",
    failures.byReason.length,
    0,
  );

  // 6. Segments: can be empty or contain only zero-valued metrics
  TestValidator.predicate(
    "segments should be empty or contain only zero metrics",
    () => {
      if (analytics.segments.length === 0) return true;

      return analytics.segments.every((segment) => {
        const segCarts = segment.carts;
        const segAbandon = segment.abandonment;
        const segFailures = segment.validationFailures;

        if (
          segCarts.totalCarts !== 0 ||
          segCarts.activeCarts !== 0 ||
          segCarts.cartsReachedCheckout !== 0 ||
          segCarts.averageItemsPerCart !== 0 ||
          segAbandon.cartAbandonmentRate !== 0 ||
          segAbandon.averageTimeToCheckoutSeconds !== 0 ||
          segAbandon.abandonedBeforeCheckoutCount !== 0 ||
          segAbandon.abandonedDuringCheckoutCount !== 0 ||
          segFailures.totalValidationFailures !== 0 ||
          segFailures.byReason.length !== 0
        ) {
          return false;
        }

        // If a timeSeries is present, all buckets must be zero-valued as well
        if (!segment.timeSeries) return true;

        return segment.timeSeries.buckets.every((bucket) => {
          const bucketCarts = bucket.cartCounts;
          const bucketFailures = bucket.validationFailures;

          return (
            bucketCarts.totalCarts === 0 &&
            bucketCarts.activeCarts === 0 &&
            bucketCarts.cartsReachedCheckout === 0 &&
            bucketCarts.averageItemsPerCart === 0 &&
            bucketFailures.totalValidationFailures === 0 &&
            bucketFailures.byReason.length === 0
          );
        });
      });
    },
  );

  // 7. If overall has no carts or validation failures, any time-series at
  // segment level has already been validated above.
}
