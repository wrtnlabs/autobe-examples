import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOverviewDashboard";

/**
 * Validate that the admin overview dashboard is protected by admin
 * authentication.
 *
 * This e2e test ensures that the highly sensitive admin KPI dashboard endpoint
 * `/shoppingMall/admin/dashboard/adminOverview` cannot be accessed without a
 * valid admin JWT, and that normal admin-authenticated access still works.
 *
 * Business rationale:
 *
 * - The overview dashboard aggregates platform-wide financial and operational
 *   KPIs and must be restricted to `admin` actors only.
 * - Anonymous or unauthenticated callers must not be able to retrieve any
 *   dashboard data.
 *
 * Test steps:
 *
 * 1. Create a new admin via POST `/auth/admin/join` to confirm that the
 *    authentication flow is functioning and to exercise the documented
 *    dependency.
 * 2. Using the authenticated connection, call `GET
 *    /shoppingMall/admin/dashboard/adminOverview` and assert that the response
 *    matches `IShoppingMallAdminOverviewDashboard`.
 * 3. Construct a _separate_ connection object that does not carry any
 *    authentication headers, simulating an unauthenticated client.
 * 4. Call the same admin overview endpoint with this unauthenticated connection
 *    and assert that the call fails by using `TestValidator.error`.
 *
 * Note: We deliberately do not inspect HTTP status codes, only that an error is
 * raised for unauthenticated access, following the global testing guidelines.
 */
export async function test_api_admin_overview_dashboard_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Join as an admin to exercise the dependency and establish a valid admin session.
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Authenticated access: admin should be able to load the overview dashboard.
  const dashboard: IShoppingMallAdminOverviewDashboard =
    await api.functional.shoppingMall.admin.dashboard.adminOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminOverviewDashboard>(dashboard);

  // 3. Build an unauthenticated connection without mutating the original.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Unauthenticated access must fail.
  await TestValidator.error(
    "unauthenticated admin overview dashboard access should fail",
    async () => {
      await api.functional.shoppingMall.admin.dashboard.adminOverview.at(
        unauthenticatedConnection,
      );
    },
  );
}
