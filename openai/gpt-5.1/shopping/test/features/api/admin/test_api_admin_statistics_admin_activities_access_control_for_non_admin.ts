import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActivityStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActivityStatistics";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate that non-admin (customer) actors cannot access admin activity
 * statistics.
 *
 * Business context:
 *
 * - GET /shoppingMall/admin/statistics/adminActivities exposes sensitive
 *   governance KPIs and must be restricted to admin actors only.
 * - Even an authenticated customer must not be able to call this endpoint
 *   successfully.
 *
 * Test workflow:
 *
 * 1. Register a new customer using POST /auth/customer/join.
 *
 *    - This also authenticates the customer and attaches a customer JWT access token
 *         into connection.headers.Authorization via SDK side-effect.
 * 2. With this customer-authenticated connection, attempt to call GET
 *    /shoppingMall/admin/statistics/adminActivities.
 * 3. Assert that the call fails with an HTTP authorization error using
 *    TestValidator.httpError.
 * 4. Ensure that no IShoppingMallAdminActivityStatistics object is ever returned
 *    to the customer in a success path (any such success would break the
 *    test).
 */
export async function test_api_admin_statistics_admin_activities_access_control_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer (non-admin actor).
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // At this point, connection.headers.Authorization is set to the customer token
  // by the SDK side-effect in auth.customer.join.

  // 2 & 3. Attempt to access admin-only statistics endpoint as customer, expect HTTP error.
  await TestValidator.httpError(
    "customer must not access admin activity statistics",
    [401, 403, 404, 500],
    async () => {
      const _stats: IShoppingMallAdminActivityStatistics =
        await api.functional.shoppingMall.admin.statistics.adminActivities.index(
          connection,
        );
      // If the call unexpectedly succeeds in some misconfigured environment,
      // still assert the type to avoid silent shape mismatches, but such a
      // success would already fail the httpError expectation.
      typia.assert(_stats);
    },
  );
}
