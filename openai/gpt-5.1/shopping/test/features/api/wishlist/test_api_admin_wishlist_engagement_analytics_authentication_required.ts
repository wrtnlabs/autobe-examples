import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallWishlistEngagementAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEngagementAnalytics";

/**
 * Verify that wishlist engagement analytics are restricted to authenticated
 * admins and reject both anonymous requests and authenticated customer tokens.
 *
 * Business context: The PATCH
 * /shoppingMall/admin/wishlists/analytics/engagement endpoint exposes
 * aggregated wishlist engagement metrics meant only for internal admin
 * dashboards. It must enforce strong access control:
 *
 * - Unauthenticated callers must not receive analytics.
 * - Authenticated non-admin actors (customers) must not be able to read
 *   admin-only analytics even if they possess valid customer JWTs.
 * - Properly authenticated admins should be able to retrieve analytics
 *   successfully using a valid
 *   IShoppingMallWishlistEngagementAnalytics.IRequest payload.
 *
 * Scenario steps:
 *
 * 1. Anonymous access rejection
 *
 *    - Create an unauthenticated connection by cloning the given connection and
 *         overriding headers with an empty object.
 *    - Build a minimal valid analytics request body with only `timeRange` populated
 *         using an ISO 8601 date-time window (from: now-1day, to: now).
 *    - Call api.functional.shoppingMall.admin.wishlists.analytics.engagement.index
 *         with the anonymous connection and expect it to fail.
 *    - Use TestValidator.error with an async closure and a descriptive title (e.g.,
 *         "anonymous access is rejected for wishlist analytics").
 *    - Do not assert specific HTTP status codes.
 * 2. Admin access success
 *
 *    - Register an admin using api.functional.auth.admin.join with a random
 *         email/password and valid href/referrer URIs, building the body as
 *         IShoppingMallAdminJoin.ICreate via `satisfies`.
 *    - The join call automatically sets connection.headers.Authorization to the
 *         admin access token.
 *    - Assert the returned IShoppingMallAdmin.IAuthorized payload via typia.assert.
 *    - Call the wishlist engagement analytics endpoint again using the same
 *         analytics request body, now with the admin-authenticated connection.
 *    - Validate the response via
 *         typia.assert<IShoppingMallWishlistEngagementAnalytics> to ensure full
 *         structural correctness.
 *    - Use TestValidator.predicate with descriptive titles to assert basic business
 *         sanity (e.g., totalWishlistCount >= 0 and non-negative
 *         itemAddEvents).
 * 3. Customer token rejection
 *
 *    - Register a customer using api.functional.auth.customer.join with a random
 *         email/password and valid href/referrer URIs, building the body as
 *         IShoppingMallCustomerJoin.IRequest.
 *    - This call will overwrite connection.headers.Authorization with a customer
 *         token.
 *    - Call the wishlist engagement analytics endpoint again with the same analytics
 *         request body using this customer-authenticated connection.
 *    - Wrap the call in TestValidator.error with an async closure and a descriptive
 *         title such as "customer token is rejected for admin wishlist
 *         analytics".
 *    - As with anonymous access, only assert that an error occurs, not the status
 *         code.
 *
 * Throughout the test:
 *
 * - Use `await` for every API call and for TestValidator.error with async
 *   callbacks.
 * - Use `satisfies` with the exact DTO types for all request bodies and never use
 *   `as any`.
 * - Do not access or manipulate connection.headers directly except when creating
 *   a new unauthenticated connection clone with headers: {}.
 */
export async function test_api_admin_wishlist_engagement_analytics_authentication_required(
  connection: api.IConnection,
) {
  // 1. Prepare a minimal, valid analytics request body shared across scenarios
  const now: Date = new Date();
  const from: string & tags.Format<"date-time"> = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const to: string & tags.Format<"date-time"> = now.toISOString() as string &
    tags.Format<"date-time">;

  const timeRange: IShoppingMallAnalyticsTimeRange = {
    from,
    to,
  } satisfies IShoppingMallAnalyticsTimeRange;

  const analyticsRequestBody = {
    timeRange,
  } satisfies IShoppingMallWishlistEngagementAnalytics.IRequest;

  // 2. Anonymous access: clone connection with empty headers to simulate no token
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous access is rejected for wishlist engagement analytics",
    async () => {
      await api.functional.shoppingMall.admin.wishlists.analytics.engagement.index(
        anonymousConnection,
        {
          body: analyticsRequestBody,
        },
      );
    },
  );

  // 3. Admin registration and successful analytics access
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminAnalyticsOutput: IShoppingMallWishlistEngagementAnalytics =
    await api.functional.shoppingMall.admin.wishlists.analytics.engagement.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert(adminAnalyticsOutput);

  TestValidator.predicate(
    "analytics totalWishlistCount is non-negative",
    adminAnalyticsOutput.totalWishlistCount >= 0,
  );
  TestValidator.predicate(
    "analytics itemAddEvents is non-negative",
    adminAnalyticsOutput.itemAddEvents >= 0,
  );

  // 4. Customer join and token-based rejection for admin analytics
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const customerHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const customerReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    href: customerHref,
    referrer: customerReferrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  await TestValidator.error(
    "customer token is rejected for admin wishlist engagement analytics",
    async () => {
      await api.functional.shoppingMall.admin.wishlists.analytics.engagement.index(
        connection,
        {
          body: analyticsRequestBody,
        },
      );
    },
  );
}
