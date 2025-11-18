import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActivityStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActivityStatsSummary";
import type { IShoppingMallAdminGovernanceOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminGovernanceOverview";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldStatsSummary";
import type { IShoppingMallOrderDailyStatPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDailyStatPoint";
import type { IShoppingMallOrderStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatsSummary";
import type { IShoppingMallPlatformKpisSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpisSummary";
import type { IShoppingMallRefundAndDisputeStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeStatsSummary";

/**
 * Verify that the admin governance overview dashboard endpoint requires
 * authentication.
 *
 * Business purpose:
 *
 * - The governance overview exposes sensitive KPIs and governance metrics and
 *   must not be accessible to anonymous callers.
 *
 * Test workflow:
 *
 * 1. Create an admin account via POST /auth/admin/join, which also authenticates
 *    the connection.
 * 2. Call GET /shoppingMall/admin/adminDashboard/governanceOverview with the
 *    authenticated connection and assert that a valid
 *    IShoppingMallAdminGovernanceOverview payload is returned.
 * 3. Create a cloned connection instance without Authorization headers.
 * 4. Call the governance overview endpoint with this unauthenticated connection
 *    and assert that an HTTP authorization error (401/403) is thrown, proving
 *    that authentication is required.
 */
export async function test_api_admin_governance_overview_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin via /auth/admin/join
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Positive control: authenticated governance overview access
  const overview: IShoppingMallAdminGovernanceOverview =
    await api.functional.shoppingMall.admin.adminDashboard.governanceOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminGovernanceOverview>(overview);

  // 3. Prepare an unauthenticated connection by providing empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Unauthenticated access must result in an HTTP authorization error
  await TestValidator.httpError(
    "unauthenticated governance overview access must fail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.adminDashboard.governanceOverview.at(
        unauthenticatedConnection,
      );
    },
  );
}
