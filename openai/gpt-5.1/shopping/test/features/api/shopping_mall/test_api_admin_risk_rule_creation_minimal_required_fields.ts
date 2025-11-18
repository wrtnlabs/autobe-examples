import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

/**
 * Validate that an authenticated admin can create a new risk evaluation rule
 * using only the required fields of IShoppingMallRiskRule.ICreate and that the
 * API responds with a persisted IShoppingMallRiskRule reflecting both the
 * request payload and system-managed fields.
 *
 * Business flow:
 *
 * 1. Register a fresh admin via POST /auth/admin/join to obtain an authenticated
 *    admin context (SDK automatically sets Authorization header).
 * 2. Call POST /shoppingMall/admin/riskRules with a body that includes only the
 *    minimal required fields:
 *
 *    - Rule_code
 *    - Name
 *    - Scope
 *    - Severity
 *    - Expression_json
 *    - Is_enabled
 * 3. Assert that the returned IShoppingMallRiskRule matches the requested fields
 *    and that core system-managed fields (id, created_at, updated_at) are
 *    populated. Also ensure no optional fields are unexpectedly populated when
 *    they were not provided.
 */
export async function test_api_admin_risk_rule_creation_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin and obtain authorized context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare minimal required IShoppingMallRiskRule.ICreate body
  const ruleCodePrefix = "risk_rule_";
  const ruleCodeSuffix = RandomGenerator.alphaNumeric(12);
  const createBody = {
    rule_code: `${ruleCodePrefix}${ruleCodeSuffix}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    scope: RandomGenerator.pick([
      "order",
      "payment",
      "account",
      "session",
    ] as const),
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    expression_json: JSON.stringify({
      metric: "failed_logins",
      threshold: 5,
      windowMinutes: 30,
    }),
    is_enabled: true,
  } satisfies IShoppingMallRiskRule.ICreate;

  // 3. Create the risk rule
  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createBody,
    });
  typia.assert(createdRule);

  // 4. Validate persisted rule fields vs request
  TestValidator.equals(
    "rule_code should match the requested business code",
    createdRule.rule_code,
    createBody.rule_code,
  );
  TestValidator.equals(
    "name should match the requested display name",
    createdRule.name,
    createBody.name,
  );
  TestValidator.equals(
    "scope should match the requested scope",
    createdRule.scope,
    createBody.scope,
  );
  TestValidator.equals(
    "severity should match the requested severity",
    createdRule.severity,
    createBody.severity,
  );
  TestValidator.equals(
    "expression_json should match the requested JSON expression",
    createdRule.expression_json,
    createBody.expression_json,
  );
  TestValidator.equals(
    "is_enabled should match the requested enabled flag",
    createdRule.is_enabled,
    createBody.is_enabled,
  );

  // System-managed fields are structurally validated by typia.assert,
  // but we can add simple presence checks for business confidence.
  TestValidator.predicate(
    "created rule id should be a non-empty string",
    createdRule.id.length > 0,
  );
  TestValidator.predicate(
    "created_at should be a non-empty string",
    createdRule.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    createdRule.updated_at.length > 0,
  );

  // 5. Ensure optional fields are not unexpectedly populated when omitted
  TestValidator.predicate(
    "description should be null or undefined when not provided",
    createdRule.description === null || createdRule.description === undefined,
  );
  TestValidator.predicate(
    "applies_to_countries should be null or undefined when not provided",
    createdRule.applies_to_countries === null ||
      createdRule.applies_to_countries === undefined,
  );
  TestValidator.predicate(
    "effective_from should be null or undefined when not provided",
    createdRule.effective_from === null ||
      createdRule.effective_from === undefined,
  );
  TestValidator.predicate(
    "effective_until should be null or undefined when not provided",
    createdRule.effective_until === null ||
      createdRule.effective_until === undefined,
  );
}
