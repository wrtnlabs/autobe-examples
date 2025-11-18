import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallWishlistEngagementAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEngagementAnalytics";

export async function test_api_admin_wishlist_engagement_analytics_basic_window(
  connection: api.IConnection,
) {
  // 1. Admin joins and receives initial authorization payload
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // omit ip to let backend infer it; it's optional (ip?: ... | null | undefined)
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Build a minimal analytics request for a recent 7-day time window
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - sevenDaysMs);

  const timeRange = {
    from: fromDate.toISOString(),
    to: now.toISOString(),
  } satisfies IShoppingMallAnalyticsTimeRange;

  const analyticsRequestBody = {
    timeRange,
    // All optional filters and segmentations omitted to test minimal payload
  } satisfies IShoppingMallWishlistEngagementAnalytics.IRequest;

  // 3. Call analytics endpoint with minimal filters
  const analytics: IShoppingMallWishlistEngagementAnalytics =
    await api.functional.shoppingMall.admin.wishlists.analytics.engagement.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert<IShoppingMallWishlistEngagementAnalytics>(analytics);

  // 4. Top-level numeric invariants
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
    "averageItemsPerWishlist is non-negative",
    analytics.averageItemsPerWishlist >= 0,
  );
  TestValidator.predicate(
    "wishlistToOrderConversionRate is between 0 and 1",
    0 <= analytics.wishlistToOrderConversionRate &&
      analytics.wishlistToOrderConversionRate <= 1,
  );

  // 5. Daily engagement bucket invariants
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

  // 6. Segment breakdown invariants (may be empty when no segmentation)
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
      "segment wishlistToOrderConversionRate is between 0 and 1",
      0 <= segment.wishlistToOrderConversionRate &&
        segment.wishlistToOrderConversionRate <= 1,
    );
  }

  // 7. Indirect read-only behavior check: this test only calls join + analytics
  // No further assertions are possible at API level, but by construction we
  // have not invoked any mutating wishlist APIs beyond auth and the analytics
  // read itself.
}
