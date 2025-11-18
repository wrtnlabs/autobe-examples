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
 * Validate admin wishlist engagement analytics with segmentation and filters.
 *
 * Business goal:
 *
 * - Ensure that an authenticated admin can request wishlist engagement analytics
 *   with rich segmentation and filtering options, and receive structurally
 *   correct, logically consistent aggregate metrics.
 * - Confirm that basic invariants (non-negative counts, active <= total, etc.)
 *   hold at top-level, per-day, and per-segment levels.
 * - Verify that unauthenticated access to the admin analytics endpoint fails.
 *
 * Scenario steps:
 *
 * 1. Admin registration (join) to obtain an authenticated admin context.
 * 2. Build a 30-day analytics time range.
 * 3. Construct a rich IShoppingMallWishlistEngagementAnalytics.IRequest payload
 *    including segmentBy, sellerIds, categoryIds, and minActivityCount.
 * 4. Call PATCH /shoppingMall/admin/wishlists/analytics/engagement as the
 *    authenticated admin and validate the response structure and invariants.
 * 5. Attempt to call the same endpoint with an unauthenticated connection and
 *    assert that it fails.
 */
export async function test_api_admin_wishlist_engagement_analytics_with_segmentation_and_filters(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Build a 30-day analytics time range ending at now
  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const timeRange: IShoppingMallAnalyticsTimeRange = {
    from: fromDate.toISOString() as string & tags.Format<"date-time">,
    to: now.toISOString() as string & tags.Format<"date-time">,
  };

  // 3. Construct a rich analytics request
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const requestBody = {
    timeRange,
    segmentBy: ["region", "category"],
    sellerIds: [sellerId],
    categoryIds: [categoryId],
    minActivityCount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
  } satisfies IShoppingMallWishlistEngagementAnalytics.IRequest;

  // 4. Call analytics endpoint as admin and validate response
  const analytics: IShoppingMallWishlistEngagementAnalytics =
    await api.functional.shoppingMall.admin.wishlists.analytics.engagement.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallWishlistEngagementAnalytics>(analytics);

  // Top-level invariants
  TestValidator.predicate(
    "totalWishlistCount is non-negative",
    analytics.totalWishlistCount >= 0,
  );
  TestValidator.predicate(
    "activeWishlistCount is non-negative",
    analytics.activeWishlistCount >= 0,
  );
  TestValidator.predicate(
    "itemAddEvents is non-negative",
    analytics.itemAddEvents >= 0,
  );
  TestValidator.predicate(
    "itemRemoveEvents is non-negative",
    analytics.itemRemoveEvents >= 0,
  );
  TestValidator.predicate(
    "activeWishlistCount does not exceed totalWishlistCount",
    analytics.activeWishlistCount <= analytics.totalWishlistCount,
  );

  // Daily buckets invariants
  for (const bucket of analytics.dailyEngagement) {
    TestValidator.predicate(
      "daily activeWishlistCount is non-negative",
      bucket.activeWishlistCount >= 0,
    );
    TestValidator.predicate(
      "daily itemAddEvents is non-negative",
      bucket.itemAddEvents >= 0,
    );
    TestValidator.predicate(
      "daily itemRemoveEvents is non-negative",
      bucket.itemRemoveEvents >= 0,
    );
    TestValidator.predicate(
      "daily conversionCount is non-negative",
      bucket.conversionCount >= 0,
    );
  }

  // Optional: daily dates are non-decreasing
  for (let i = 1; i < analytics.dailyEngagement.length; ++i) {
    const prev = analytics.dailyEngagement[i - 1];
    const curr = analytics.dailyEngagement[i];
    TestValidator.predicate(
      "dailyEngagement dates are non-decreasing",
      prev.date <= curr.date,
    );
  }

  // Segment buckets invariants
  for (const segment of analytics.segmentBreakdowns) {
    TestValidator.predicate(
      "segment totalWishlistCount is non-negative",
      segment.totalWishlistCount >= 0,
    );
    TestValidator.predicate(
      "segment activeWishlistCount is non-negative",
      segment.activeWishlistCount >= 0,
    );
    TestValidator.predicate(
      "segment itemAddEvents is non-negative",
      segment.itemAddEvents >= 0,
    );
    TestValidator.predicate(
      "segment itemRemoveEvents is non-negative",
      segment.itemRemoveEvents >= 0,
    );
    TestValidator.predicate(
      "segment activeWishlistCount does not exceed totalWishlistCount",
      segment.activeWishlistCount <= segment.totalWishlistCount,
    );
    if (segment.segmentKey.length > 0 || segment.segmentType.length > 0) {
      TestValidator.predicate(
        "segmentKey is non-empty when segments exist",
        segment.segmentKey.length > 0,
      );
      TestValidator.predicate(
        "segmentType is non-empty when segments exist",
        segment.segmentType.length > 0,
      );
    }
  }

  // 5. Unauthenticated access should fail
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated wishlist analytics request should fail",
    async () => {
      await api.functional.shoppingMall.admin.wishlists.analytics.engagement.index(
        unauthConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
