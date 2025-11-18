import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

/**
 * Ensure duplicate risk rule creation with the same rule_code is rejected.
 *
 * Business purpose:
 *
 * - Risk rules are addressed by a stable business identifier `rule_code` and the
 *   database has a unique index on this column.
 * - Admin tooling must not allow two different risk rule records to share the
 *   same `rule_code`, otherwise downstream risk engines and dashboards would
 *   not be able to distinguish which configuration applies.
 *
 * Scenario:
 *
 * 1. Register a new shopping mall admin through POST /auth/admin/join.
 *
 *    - Use a unique random email and a valid password format.
 *    - Provide realistic href and referrer URIs.
 *    - Rely on the SDK to attach the issued access token to the connection.
 * 2. As that authenticated admin, create a risk rule via POST
 *    /shoppingMall/admin/riskRules with a chosen `rule_code` and other valid
 *    configuration fields.
 *
 *    - Assert that the call succeeds and returns a valid IShoppingMallRiskRule.
 * 3. With the same admin connection (so that auth context is identical), call POST
 *    /shoppingMall/admin/riskRules again, reusing exactly the same `rule_code`
 *    while still providing otherwise valid configuration data.
 * 4. Assert that this second call fails using TestValidator.error, confirming that
 *    the unique index on `rule_code` is enforced.
 *
 *    - Do not inspect HTTP status codes or error payload details; just verify that
 *         an error occurs.
 */
export async function test_api_admin_risk_rule_creation_with_duplicate_rule_code_rejected(
  connection: api.IConnection,
) {
  // 1. Register a new admin and establish authenticated context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create an initial risk rule with a specific, stable rule_code
  const ruleCode = "high_refund_rate";

  const firstRuleBody = {
    rule_code: ruleCode,
    name: "High refund rate detection",
    scope: "order",
    severity: "high",
    expression_json: JSON.stringify({
      metric: "refund_rate",
      window_days: 30,
      threshold: 0.3,
    }),
    description:
      "Flags accounts whose refund rate exceeds 30% over the last 30 days.",
    is_enabled: true,
    applies_to_countries: JSON.stringify(["US", "KR"]),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const firstRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: firstRuleBody,
    });
  typia.assert(firstRule);

  TestValidator.equals(
    "first created rule_code should match input",
    firstRule.rule_code,
    ruleCode,
  );

  // 3. Attempt to create a duplicate rule with the same rule_code
  const secondRuleBody = {
    rule_code: ruleCode,
    name: "High refund rate detection duplicate",
    scope: "order",
    severity: "high",
    expression_json: JSON.stringify({
      metric: "refund_rate",
      window_days: 60,
      threshold: 0.25,
    }),
    description:
      "Intentionally duplicated rule to verify uniqueness constraint.",
    is_enabled: true,
    applies_to_countries: JSON.stringify(["US", "KR"]),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  await TestValidator.error(
    "duplicate rule_code creation must fail",
    async () => {
      await api.functional.shoppingMall.admin.riskRules.create(connection, {
        body: secondRuleBody,
      });
    },
  );
}
