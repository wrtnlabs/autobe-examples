import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskRule";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

/**
 * Verify that risk rule search is admin-only and unauthenticated callers are
 * rejected.
 *
 * Business goal:
 *
 * - Ensure PATCH /shoppingMall/admin/riskRules cannot be used without an admin
 *   authentication context, while confirming that the same request succeeds
 *   after an admin joins (auth bootstrap).
 *
 * Steps:
 *
 * 1. Build a minimal, valid IShoppingMallRiskRule.IRequest body with page=1 and
 *    limit=10, leaving all other filters undefined.
 * 2. Clone the incoming connection into an unauthenticated variant by copying all
 *    fields but overriding headers to an empty object literal. This avoids
 *    touching the original connection.headers while guaranteeing that no
 *    Authorization header is present for the first call.
 * 3. Using the unauthenticated connection clone, call
 *    api.functional.shoppingMall.admin.riskRules.index and assert that the
 *    operation fails using TestValidator.error. Do not inspect the error type
 *    or status code; only assert that an error is thrown.
 * 4. Using the original connection (which will later be authenticated), call
 *    api.functional.auth.admin.join with a randomly generated
 *    IShoppingMallAdminJoin.ICreate body to create an admin account and obtain
 *    an admin token. The SDK will automatically attach the Authorization header
 *    to connection.headers.
 * 5. Reuse the same minimal IShoppingMallRiskRule.IRequest body and invoke
 *    api.functional.shoppingMall.admin.riskRules.index again, this time using
 *    the now-authenticated original connection.
 * 6. Assert that the second call succeeds by:
 *
 *    - Type-checking the response with
 *         typia.assert<IPageIShoppingMallRiskRule.ISummary>
 *    - Optionally validating simple pagination invariants (e.g., page and limit
 *         fields) via TestValidator, without any assumptions on the number of
 *         data elements.
 */
export async function test_api_risk_rules_search_unauthorized_without_admin_auth(
  connection: api.IConnection,
) {
  // 1. Build minimal risk rule search request body
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallRiskRule.IRequest;

  // 2. Create an unauthenticated connection clone with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Ensure unauthenticated call fails
  await TestValidator.error(
    "unauthenticated risk rule search should fail",
    async () => {
      await api.functional.shoppingMall.admin.riskRules.index(
        unauthenticatedConnection,
        { body: requestBody },
      );
    },
  );

  // 4. Join as admin to obtain authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 5. Authenticated risk rule search should succeed
  const page: IPageIShoppingMallRiskRule.ISummary =
    await api.functional.shoppingMall.admin.riskRules.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageIShoppingMallRiskRule.ISummary>(page);

  // 6. Basic pagination sanity checks
  TestValidator.equals(
    "pagination current page should be 1",
    page.pagination.current,
    1 as number,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    page.pagination.limit,
    10 as number,
  );
}
