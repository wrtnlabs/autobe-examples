import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallWishlistEngagementAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEngagementAnalytics";

/**
 * Validate wishlist engagement analytics behavior for invalid and extreme time
 * ranges.
 *
 * Business context:
 *
 * - The admin analytics endpoint PATCH
 *   /shoppingMall/admin/wishlists/analytics/engagement returns aggregated
 *   wishlist engagement metrics over a requested time range.
 * - Admin authentication is required via POST /auth/admin/join, which also seeds
 *   an initial admin session and installs the Authorization header in the
 *   shared connection object.
 *
 * This test focuses on high-level business behavior for time range handling,
 * not on low-level type validation or HTTP status codes.
 *
 * Flow:
 *
 * 1. Register a new admin with POST /auth/admin/join to obtain an authorized admin
 *    context on the connection.
 * 2. Call the analytics endpoint with a logically invalid time range where the
 *    `from` timestamp is after the `to` timestamp, and assert that the server
 *    still returns a structurally valid
 *    IShoppingMallWishlistEngagementAnalytics payload. We do not assert
 *    specific HTTP status codes or type errors; instead we verify that metrics
 *    remain non-negative and structurally sound.
 * 3. Call the analytics endpoint again with an extremely long time range spanning
 *    multiple years, verifying that:
 *
 *    - The response remains structurally valid.
 *    - Aggregate numeric metrics (counts, conversion rate, averages) are
 *         non-negative.
 *    - Daily and segment buckets are structurally valid when present.
 *
 * The goal is to ensure that even unusual time ranges (reversed bounds or very
 * long windows) do not break the analytics endpoint and that it continues to
 * respect its schema and basic business invariants.
 */
export async function test_api_admin_wishlist_engagement_analytics_invalid_time_range_handling(
  connection: api.IConnection,
) {
  // 1. Admin registration to establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // Helper to perform basic business sanity checks on analytics
  const assertAnalyticsSanity = (
    title: string,
    analytics: IShoppingMallWishlistEngagementAnalytics,
  ): void => {
    typia.assert<IShoppingMallWishlistEngagementAnalytics>(analytics);

    TestValidator.predicate(
      `${title} - totalWishlistCount non-negative`,
      analytics.totalWishlistCount >= 0,
    );
    TestValidator.predicate(
      `${title} - activeWishlistCount non-negative`,
      analytics.activeWishlistCount >= 0,
    );
    TestValidator.predicate(
      `${title} - itemAddEvents non-negative`,
      analytics.itemAddEvents >= 0,
    );
    TestValidator.predicate(
      `${title} - itemRemoveEvents non-negative`,
      analytics.itemRemoveEvents >= 0,
    );
    TestValidator.predicate(
      `${title} - averageItemsPerWishlist non-negative`,
      analytics.averageItemsPerWishlist >= 0,
    );
    TestValidator.predicate(
      `${title} - wishlistToOrderConversionRate non-negative`,
      analytics.wishlistToOrderConversionRate >= 0,
    );

    // Daily buckets sanity
    for (const bucket of analytics.dailyEngagement) {
      typia.assert<IShoppingMallWishlistEngagementAnalytics.IDailyBucket>(
        bucket,
      );
      TestValidator.predicate(
        `${title} - daily activeWishlistCount non-negative`,
        bucket.activeWishlistCount >= 0,
      );
      TestValidator.predicate(
        `${title} - daily itemAddEvents non-negative`,
        bucket.itemAddEvents >= 0,
      );
      TestValidator.predicate(
        `${title} - daily itemRemoveEvents non-negative`,
        bucket.itemRemoveEvents >= 0,
      );
      TestValidator.predicate(
        `${title} - daily conversionCount non-negative`,
        bucket.conversionCount >= 0,
      );
    }

    // Segment buckets sanity
    for (const segment of analytics.segmentBreakdowns) {
      typia.assert<IShoppingMallWishlistEngagementAnalytics.ISegmentBucket>(
        segment,
      );
      TestValidator.predicate(
        `${title} - segment totalWishlistCount non-negative`,
        segment.totalWishlistCount >= 0,
      );
      TestValidator.predicate(
        `${title} - segment activeWishlistCount non-negative`,
        segment.activeWishlistCount >= 0,
      );
      TestValidator.predicate(
        `${title} - segment itemAddEvents non-negative`,
        segment.itemAddEvents >= 0,
      );
      TestValidator.predicate(
        `${title} - segment itemRemoveEvents non-negative`,
        segment.itemRemoveEvents >= 0,
      );
      TestValidator.predicate(
        `${title} - segment wishlistToOrderConversionRate non-negative`,
        segment.wishlistToOrderConversionRate >= 0,
      );
    }
  };

  // 2. Call analytics with an invalid (reversed) time range
  const reversedTimeRange: IShoppingMallAnalyticsTimeRange = {
    from: "2025-01-10T00:00:00.000Z" as string & tags.Format<"date-time">,
    to: "2025-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
  };

  const reversedRequest = {
    timeRange: reversedTimeRange,
  } satisfies IShoppingMallWishlistEngagementAnalytics.IRequest;

  const reversedAnalytics: IShoppingMallWishlistEngagementAnalytics =
    await api.functional.shoppingMall.admin.wishlists.analytics.engagement.index(
      connection,
      { body: reversedRequest },
    );

  assertAnalyticsSanity("reversed-range", reversedAnalytics);

  // 3. Call analytics with an extremely long time range (multi-year)
  const longRange: IShoppingMallAnalyticsTimeRange = {
    from: "2015-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
    to: "2030-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
  };

  const longRangeRequest = {
    timeRange: longRange,
  } satisfies IShoppingMallWishlistEngagementAnalytics.IRequest;

  const longRangeAnalytics: IShoppingMallWishlistEngagementAnalytics =
    await api.functional.shoppingMall.admin.wishlists.analytics.engagement.index(
      connection,
      { body: longRangeRequest },
    );

  assertAnalyticsSanity("long-range", longRangeAnalytics);

  // Additional relational sanity: long-range aggregates should be at least as
  // large as reversed-range aggregates when both succeed, since the long range
  // covers a superset of possible events. We only assert non-strict ordering to
  // accommodate engine-specific normalization.
  TestValidator.predicate(
    "long-range totalWishlistCount >= reversed-range totalWishlistCount",
    longRangeAnalytics.totalWishlistCount >=
      reversedAnalytics.totalWishlistCount,
  );
  TestValidator.predicate(
    "long-range activeWishlistCount >= reversed-range activeWishlistCount",
    longRangeAnalytics.activeWishlistCount >=
      reversedAnalytics.activeWishlistCount,
  );
  TestValidator.predicate(
    "long-range itemAddEvents >= reversed-range itemAddEvents",
    longRangeAnalytics.itemAddEvents >= reversedAnalytics.itemAddEvents,
  );
  TestValidator.predicate(
    "long-range itemRemoveEvents >= reversed-range itemRemoveEvents",
    longRangeAnalytics.itemRemoveEvents >= reversedAnalytics.itemRemoveEvents,
  );
}
