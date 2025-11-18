import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAnalyticsDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsDateRange";
import type { IAnalyticsPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsPagination";
import type { IAnalyticsSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsSort";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSubscription";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscription";
import type { IShoppingMallSellerSubscriptionAnalyticsPlanBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionAnalyticsPlanBreakdown";
import type { IShoppingMallSellerSubscriptionAnalyticsStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionAnalyticsStatusBreakdown";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate unauthorized vs authorized access to seller subscription analytics.
 *
 * Business intent:
 *
 * - Ensure that PATCH /shoppingMall/admin/analytics/sellerSubscriptions, which
 *   exposes sensitive seller subscription analytics, cannot be called without
 *   an authenticated admin context.
 * - Confirm that, after a successful admin join (which issues JWT tokens and
 *   binds them to the SDK connection), the same analytics endpoint can be
 *   called successfully and returns a structurally valid analytics page.
 *
 * Test steps:
 *
 * 1. Construct a minimal analytics request payload using
 *    IShoppingMallSellerSubscription.IRequest. We rely on typia.random to
 *    satisfy all structural constraints.
 * 2. Derive an unauthenticated connection from the provided `connection` by
 *    cloning it and giving it an empty headers object. Never mutate
 *    connection.headers directly.
 * 3. Call the analytics endpoint with the unauthenticated connection inside
 *    TestValidator.error, asserting that some error is raised. We deliberately
 *    do not assert the status code; the goal is only that the call is
 *    rejected.
 * 4. Register an admin via POST /auth/admin/join with a valid
 *    IShoppingMallAdminJoin.ICreate body. This operation mutates the original
 *    `connection` to include a valid Authorization header.
 * 5. Call the analytics endpoint again, now with the authenticated `connection`,
 *    and assert that the response is a valid
 *    IPageIShoppingMallSellerSubscription.ISummary using typia.assert.
 */
export async function test_api_admin_seller_subscription_analytics_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Prepare a random analytics request body
  const analyticsRequest =
    typia.random<IShoppingMallSellerSubscription.IRequest>();

  // 2. Build an unauthenticated connection (never touch headers afterwards)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Verify that unauthenticated access is rejected
  await TestValidator.error(
    "unauthenticated access to seller subscription analytics should fail",
    async () => {
      await api.functional.shoppingMall.admin.analytics.sellerSubscriptions.index(
        unauthConn,
        {
          body: analyticsRequest,
        },
      );
    },
  );

  // 4. Join as an admin to obtain a valid Authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 5. Call analytics endpoint again with authenticated admin connection
  const authorizedAnalytics: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerSubscriptions.index(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(authorizedAnalytics);

  // Basic sanity checks on the analytics page structure
  TestValidator.predicate(
    "authorized analytics response should contain pagination metadata",
    authorizedAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "authorized analytics response should include data array",
    Array.isArray(authorizedAnalytics.data),
  );
}
