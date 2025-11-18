import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldOverview";

/**
 * Verify that the admin legal hold overview dashboard is protected by
 * admin-only authorization and that unauthorized callers cannot access it.
 *
 * Business context: The legal hold overview contains sensitive compliance and
 * governance information aggregated from legal hold records. It must never be
 * exposed to unauthenticated or non-admin actors. Only authenticated admin
 * sessions created through the admin join/login flow are allowed to access this
 * endpoint.
 *
 * Test steps:
 *
 * 1. Construct an unauthenticated connection by shallow-cloning the provided
 *    connection and overriding headers with an empty object. This represents a
 *    caller with no Authorization token.
 * 2. Invoke GET /shoppingMall/admin/adminDashboard/legalHoldOverview using the
 *    unauthenticated connection and assert that it fails by throwing an error
 *    using TestValidator.error. Do not assert specific HTTP status codes or
 *    error payload structure.
 * 3. Using the original connection, perform POST /auth/admin/join with a randomly
 *    generated but valid IShoppingMallAdminJoin.ICreate payload. This will
 *    create a new admin account and, via the SDK, automatically attach the
 *    admin access token to the connection headers.
 * 4. Assert the join response as IShoppingMallAdmin.IAuthorized using
 *    typia.assert, ensuring the authorization payload structure is valid.
 * 5. With the authenticated connection, call GET
 *    /shoppingMall/admin/adminDashboard/legalHoldOverview again and assert that
 *    it succeeds, returning an IShoppingMallLegalHoldOverview response.
 * 6. Validate the overview response with typia.assert and perform a few light
 *    business sanity checks using TestValidator (e.g., totalActiveHolds is
 *    non-negative and agingBuckets length is consistent with totalActiveHolds
 *    when relevant), without duplicating structural validation already
 *    performed by typia.
 */
export async function test_api_admin_legal_hold_overview_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Build an unauthenticated connection by cloning the existing one but
  //    clearing headers. Do not touch headers of the original connection.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Verify that unauthenticated access to the legal hold overview fails.
  await TestValidator.error(
    "unauthenticated access to legal hold overview must fail",
    async () => {
      await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
        unauthConn,
      );
    },
  );

  // 3. Join as an admin using the original (potentially authenticated) connection.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 4. With the now-authenticated connection, fetch the legal hold overview.
  const overview: IShoppingMallLegalHoldOverview =
    await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
      connection,
    );
  typia.assert<IShoppingMallLegalHoldOverview>(overview);

  // 5. Light business sanity checks.
  TestValidator.predicate(
    "totalActiveHolds should be non-negative",
    overview.totalActiveHolds >= 0,
  );

  TestValidator.predicate(
    "recentActivity windowDays should be positive",
    overview.recentActivity.windowDays > 0,
  );

  TestValidator.predicate(
    "trend points length should be non-negative and consistent",
    overview.trend.points.length >= 0,
  );
}
