import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformKpiSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpiSnapshot";

/**
 * Verify that unauthenticated callers cannot access platform KPI analytics,
 * while authenticated admins can successfully search KPI snapshots.
 *
 * Business goals:
 *
 * - Ensure that the PATCH /shoppingMall/admin/analytics/platformKpis endpoint is
 *   protected by admin authentication.
 * - Demonstrate that access without any Authorization context fails.
 * - Demonstrate that access after a proper admin join succeeds and returns a
 *   paginated KPI snapshot page.
 *
 * Scenario steps:
 *
 * 1. Prepare a minimal, valid KPI search request body using
 *    IShoppingMallPlatformKpiSnapshot.IRequest with only page/limit populated.
 * 2. Create an unauthenticated connection by cloning the incoming connection and
 *    overriding headers to an empty object, without touching it afterwards.
 * 3. Using the unauthenticated connection, attempt to call the KPI search endpoint
 *    and verify that it results in an authorization error using
 *    TestValidator.error (not TestValidator.httpError), without asserting a
 *    specific status code.
 * 4. Join an admin via POST /auth/admin/join using a valid
 *    IShoppingMallAdminJoin.ICreate body. Let the SDK manage Authorization
 *    headers; do not manipulate connection.headers in the test.
 * 5. Assert the join response shape with typia.assert to confirm a valid
 *    IShoppingMallAdmin.IAuthorized payload.
 * 6. With the now-authenticated original connection, call the KPI search endpoint
 *    again using the same request body.
 * 7. Assert the successful response with
 *    typia.assert<IPageIShoppingMallPlatformKpiSnapshot>().
 * 8. Validate business-level semantics such as pagination.current and
 *    pagination.limit matching the requested page and limit using
 *    TestValidator.equals, but do not perform redundant type validations.
 */
export async function test_api_admin_platform_kpi_search_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Prepare a minimal, valid KPI search request body
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  // 2. Create an unauthenticated connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Unauthenticated access should fail with an authorization error
  await TestValidator.error(
    "unauthenticated KPI search should fail",
    async () => {
      await api.functional.shoppingMall.admin.analytics.platformKpis.index(
        unauthConn,
        { body: requestBody },
      );
    },
  );

  // 4. Join an admin via /auth/admin/join using a valid body
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 7. Authenticated KPI search should succeed
  const kpiPage: IPageIShoppingMallPlatformKpiSnapshot =
    await api.functional.shoppingMall.admin.analytics.platformKpis.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IPageIShoppingMallPlatformKpiSnapshot>(kpiPage);

  // 8. Business-level pagination validation
  TestValidator.equals(
    "pagination current page should match requested page",
    requestBody.page,
    kpiPage.pagination.current,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    requestBody.limit,
    kpiPage.pagination.limit,
  );
}
