import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRiskOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskOverviewDashboard";

/**
 * Verify that the platform admin risk overview dashboard enforces
 * authorization.
 *
 * Business intent:
 *
 * - The risk overview dashboard exposes highly sensitive, aggregated risk and
 *   fraud metrics, and must only be visible to authenticated platform
 *   administrators.
 * - Unauthenticated callers (no Authorization header) must not be able to
 *   retrieve this dashboard.
 *
 * Covered steps:
 *
 * 1. Bootstrap a platform admin account via POST /auth/platformAdmin/join.
 *
 *    - This call both creates the admin and attaches an access token to the provided
 *         connection through its Authorization header.
 * 2. Using this authenticated platformAdmin connection, call GET
 *    /shoppingMall/platformAdmin/dashboard/riskOverview and verify that a
 *    well-typed IShoppingMallRiskOverviewDashboard is returned.
 * 3. Construct a separate, unauthenticated connection object with empty headers
 *    (by shallow copying the original connection and overriding headers during
 *    creation; never mutate headers afterwards).
 * 4. Attempt to call the same risk overview endpoint with this unauthenticated
 *    connection and assert that it fails via TestValidator.error, proving that
 *    authorization is required.
 *
 * Notes and constraints:
 *
 * - We do not assert specific HTTP status codes (401 vs 403); we only assert that
 *   an error is thrown for unauthenticated access.
 * - We do not attempt to forge invalid or non-admin tokens by touching
 *   connection.headers, as this is forbidden; only the SDK may manage headers.
 * - We do not inspect or assert the structure of error payloads, only that an
 *   error condition occurs.
 */
export async function test_api_platform_admin_risk_overview_authorization_required(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator to obtain an authenticated session.
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: typia.random<IShoppingMallPlatformAdminJoin.IRequest>(),
    });
  typia.assert(admin);

  // 2. Positive path: authenticated platformAdmin can access risk overview.
  const dashboard: IShoppingMallRiskOverviewDashboard =
    await api.functional.shoppingMall.platformAdmin.dashboard.riskOverview.at(
      connection,
    );
  typia.assert(dashboard);

  // 3. Create an unauthenticated connection by resetting headers at creation.
  //    After this point, do not touch unauthConn.headers directly.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Negative path: unauthenticated access must result in an error.
  await TestValidator.error(
    "unauthenticated access to risk overview dashboard is rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.dashboard.riskOverview.at(
        unauthConn,
      );
    },
  );
}
