import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

/**
 * Validate creation of a risk rule with regional and temporal applicability
 * metadata.
 *
 * Business flow:
 *
 * 1. Register a new admin using POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. Using the authenticated connection, call POST /shoppingMall/admin/riskRules
 *    to create a risk rule with:
 *
 *    - Required core fields (rule_code, name, scope, severity, expression_json,
 *         is_enabled)
 *    - Optional fields applies_to_countries, effective_from, effective_until
 * 3. Assert that the created IShoppingMallRiskRule echoes all provided
 *    configuration fields correctly, especially the optional regional and
 *    temporal scope metadata.
 */
export async function test_api_admin_risk_rule_creation_with_regional_and_temporal_scope(
  connection: api.IConnection,
) {
  // 1. Join an admin to establish authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. Prepare regional and temporal configuration for risk rule
  const ruleCodeBase = "high_refund_rate_" + RandomGenerator.alphaNumeric(8);
  const ruleName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });

  const possibleScopes = ["order", "payment", "account"] as const;
  const possibleSeverities = ["low", "medium", "high"] as const;
  const scope = RandomGenerator.pick(possibleScopes);
  const severity = RandomGenerator.pick(possibleSeverities);

  const expressionObject = {
    threshold: 5,
    window_days: 30,
    reason: "auto-generated for e2e test",
  } as const;
  const expressionJson = JSON.stringify(expressionObject);

  const countries = ["US", "KR"] as const;
  const appliesToCountriesJson = JSON.stringify(countries);

  const now = new Date();
  const fromDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes in future
  const untilDate = new Date(fromDate.getTime() + 60 * 60 * 1000); // +1 hour
  const effectiveFrom = fromDate.toISOString();
  const effectiveUntil = untilDate.toISOString();

  const riskRuleCreateBody = {
    rule_code: ruleCodeBase,
    name: ruleName,
    scope,
    severity,
    expression_json: expressionJson,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    is_enabled: true,
    applies_to_countries: appliesToCountriesJson,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRiskRule.ICreate;

  // 3. Create the risk rule
  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: riskRuleCreateBody,
    });
  typia.assert<IShoppingMallRiskRule>(createdRule);

  // 4. Validate that core fields are persisted correctly
  TestValidator.equals(
    "rule_code should match input",
    createdRule.rule_code,
    riskRuleCreateBody.rule_code,
  );
  TestValidator.equals(
    "name should match input",
    createdRule.name,
    riskRuleCreateBody.name,
  );
  TestValidator.equals(
    "scope should match input",
    createdRule.scope,
    riskRuleCreateBody.scope,
  );
  TestValidator.equals(
    "severity should match input",
    createdRule.severity,
    riskRuleCreateBody.severity,
  );
  TestValidator.equals(
    "expression_json should match input",
    createdRule.expression_json,
    riskRuleCreateBody.expression_json,
  );
  TestValidator.equals(
    "is_enabled should be true",
    createdRule.is_enabled,
    riskRuleCreateBody.is_enabled,
  );

  // 5. Validate that regional and temporal metadata are persisted
  TestValidator.equals(
    "applies_to_countries JSON text should be preserved",
    createdRule.applies_to_countries,
    riskRuleCreateBody.applies_to_countries,
  );
  TestValidator.equals(
    "effective_from should match input",
    createdRule.effective_from,
    riskRuleCreateBody.effective_from,
  );
  TestValidator.equals(
    "effective_until should match input",
    createdRule.effective_until,
    riskRuleCreateBody.effective_until,
  );

  // 6. Sanity check: effective_until is after effective_from in the persisted entity
  if (
    createdRule.effective_from !== null &&
    createdRule.effective_from !== undefined &&
    createdRule.effective_until !== null &&
    createdRule.effective_until !== undefined
  ) {
    const fromTime = new Date(createdRule.effective_from).getTime();
    const untilTime = new Date(createdRule.effective_until).getTime();
    TestValidator.predicate(
      "effective_until should be later than effective_from",
      untilTime > fromTime,
    );
  }
}
