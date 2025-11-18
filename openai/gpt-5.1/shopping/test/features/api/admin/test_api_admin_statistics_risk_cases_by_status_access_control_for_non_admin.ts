import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallRiskCaseStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseStatusStatistics";

/**
 * Verify that non-admin actors (customers) cannot access admin-only risk case
 * status statistics, while admins can.
 *
 * Business goal
 *
 * - Ensure GET /shoppingMall/admin/statistics/riskCasesByStatus is restricted to
 *   admin governance users.
 * - Confirm that a customer-authenticated session is rejected when calling this
 *   endpoint, enforcing proper authorizationActor=admin.
 *
 * High level steps
 *
 * 1. Create a fresh connection copy for admin usage.
 * 2. Admin join: POST /auth/admin/join to obtain an admin session.
 * 3. Call GET /shoppingMall/admin/statistics/riskCasesByStatus as admin and
 *    validate a successful, well-typed statistics response.
 * 4. Create another fresh connection copy for customer usage.
 * 5. Customer join: POST /auth/customer/join to obtain a customer session.
 * 6. Attempt the statistics call as a customer and assert that it fails.
 */
export async function test_api_admin_statistics_risk_cases_by_status_access_control_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Prepare a fresh connection for admin (no headers carried over)
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Admin joins (admin account creation + authentication)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminConnection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 3. Call statistics endpoint as admin and validate success
  const adminStats: IShoppingMallRiskCaseStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.riskCasesByStatus.index(
      adminConnection,
    );
  typia.assert<IShoppingMallRiskCaseStatusStatistics>(adminStats);

  // Optional consistency check: totalCases >= 0 and matches sum of bucket counts
  const totalFromBuckets = adminStats.buckets.reduce(
    (sum, bucket) => sum + bucket.count,
    0 as number,
  );

  TestValidator.equals(
    "totalCases equals sum of bucket counts (admin stats)",
    adminStats.totalCases,
    totalFromBuckets,
  );

  // 4. Prepare a fresh connection for a customer (non-admin)
  const customerConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Customer joins (customer account creation + authentication)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(customerConnection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 6. Attempt to call statistics as customer and assert that it fails.
  await TestValidator.error(
    "non-admin customer must be denied when accessing risk case statistics",
    async () => {
      await api.functional.shoppingMall.admin.statistics.riskCasesByStatus.index(
        customerConnection,
      );
    },
  );
}
