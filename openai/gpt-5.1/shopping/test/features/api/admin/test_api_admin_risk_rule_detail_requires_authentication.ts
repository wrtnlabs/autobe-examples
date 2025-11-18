import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

/**
 * Verify that admin risk rule detail endpoint enforces authentication.
 *
 * Business intent: The GET /shoppingMall/admin/riskRules/{ruleCode} endpoint
 * exposes full configuration of a risk rule and must only be callable by
 * authenticated admin actors. Unauthenticated callers (no Authorization header)
 * must not be able to retrieve IShoppingMallRiskRule data, and instead should
 * receive an authentication/authorization HTTP error (e.g., 401 or 403).
 *
 * Test strategy:
 *
 * 1. Do NOT perform any admin join/login on the shared test connection.
 * 2. Derive a separate unauthenticated connection object whose headers are an
 *    empty object, so no Authorization header is present, while keeping other
 *    connection properties (host, options, etc.) intact.
 * 3. Using this unauthenticated connection, call
 *    api.functional.shoppingMall.admin.riskRules.at with a random ruleCode.
 * 4. Use TestValidator.httpError to assert that the SDK throws an HttpError with
 *    status code 401 or 403, meaning authentication/authorization is required.
 * 5. Because the call fails with an HttpError and never returns
 *    IShoppingMallRiskRule, no sensitive configuration data is leaked to the
 *    caller.
 */
export async function test_api_admin_risk_rule_detail_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by cloning host/options but
  //    dropping any existing headers. This respects the rule that tests must
  //    not mutate connection.headers on the shared connection instance.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Use a random business-like code string for ruleCode. We don't need a
  //    real existing rule because authentication is enforced before resource
  //    lookup, and our purpose is only to observe auth failure.
  const ruleCode: string = RandomGenerator.alphaNumeric(16);

  // 3. Assert that calling the admin risk rule detail endpoint with an
  //    unauthenticated connection results in an HttpError with 401 or 403.
  //    TestValidator.httpError is explicitly designed for this purpose.
  await TestValidator.httpError(
    "unauthenticated requests for risk rule detail must be rejected",
    [401, 403],
    async () => {
      // Every SDK call must be awaited; any HttpError will be captured by
      // TestValidator.httpError.
      await api.functional.shoppingMall.admin.riskRules.at(unauthenticated, {
        ruleCode,
      });
    },
  );
}
