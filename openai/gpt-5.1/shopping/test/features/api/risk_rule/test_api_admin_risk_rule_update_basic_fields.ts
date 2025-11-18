import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

/**
 * Validate that an authenticated admin can update core configurable fields of a
 * risk rule while preserving immutable identifiers and lifecycle fields.
 *
 * Business flow:
 *
 * 1. Join as a new admin using POST /auth/admin/join.
 * 2. Create an initial risk rule via POST /shoppingMall/admin/riskRules.
 * 3. Update that rule via PUT /shoppingMall/admin/riskRules/{ruleCode}, modifying
 *    several configurable fields.
 * 4. Assert that mutable fields reflect the update while id, rule_code, and
 *    created_at remain unchanged and updated_at advances.
 */
export async function test_api_admin_risk_rule_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an initial risk rule
  const initialRuleCode: string = `rule_${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    rule_code: initialRuleCode,
    name: "Initial risk rule name",
    scope: "order",
    severity: "medium",
    expression_json: JSON.stringify({ type: "threshold", limit: 3 }),
    description: "Initial description for risk rule",
    is_enabled: true,
    applies_to_countries: JSON.stringify(["US", "KR"]),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallRiskRule>(createdRule);

  // Capture original immutable and lifecycle fields for later comparison
  const originalId = createdRule.id;
  const originalRuleCode = createdRule.rule_code;
  const originalCreatedAt = createdRule.created_at;
  const originalUpdatedAt = createdRule.updated_at;
  const originalDeletedAt = createdRule.deleted_at ?? null;

  // Basic sanity checks on creation
  TestValidator.equals(
    "created rule_code should match requested rule_code",
    createdRule.rule_code,
    initialRuleCode,
  );

  // 3. Update the risk rule with new core fields
  const updatedExpression = JSON.stringify({ type: "threshold", limit: 5 });
  const updatedDescription = "Updated description for risk rule";

  const updateBody = {
    name: "Updated risk rule name",
    // Keep the same scope but send explicitly to verify it can be updated
    scope: "order",
    severity: "high",
    expression_json: updatedExpression,
    description: updatedDescription,
    is_enabled: false,
    applies_to_countries: JSON.stringify(["US"]),
    // Shift effective window a bit in the future
    effective_from: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    effective_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  } satisfies IShoppingMallRiskRule.IUpdate;

  const updatedRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.update(connection, {
      ruleCode: originalRuleCode,
      body: updateBody,
    });
  typia.assert<IShoppingMallRiskRule>(updatedRule);

  // 4. Validate invariants and field updates on the response

  // Immutable identifiers must remain unchanged
  TestValidator.equals(
    "id must remain unchanged after update",
    updatedRule.id,
    originalId,
  );
  TestValidator.equals(
    "rule_code must remain unchanged after update",
    updatedRule.rule_code,
    originalRuleCode,
  );

  // created_at should remain the same
  TestValidator.equals(
    "created_at should not change after update",
    updatedRule.created_at,
    originalCreatedAt,
  );

  // updated_at should advance (be different from original)
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedRule.updated_at,
    originalUpdatedAt,
  );

  // deleted_at should stay null (or remain unchanged if backend sets null-ish)
  TestValidator.equals(
    "deleted_at should remain null after non-delete update",
    updatedRule.deleted_at ?? null,
    originalDeletedAt,
  );

  // Core configurable fields should match the update payload
  TestValidator.equals(
    "name field should reflect updated value",
    updatedRule.name,
    updateBody.name,
  );
  TestValidator.equals(
    "scope field should reflect updated value",
    updatedRule.scope,
    updateBody.scope,
  );
  TestValidator.equals(
    "severity field should reflect updated value",
    updatedRule.severity,
    updateBody.severity,
  );
  TestValidator.equals(
    "expression_json field should reflect updated value",
    updatedRule.expression_json,
    updateBody.expression_json,
  );
  TestValidator.equals(
    "description field should reflect updated value",
    updatedRule.description ?? null,
    updateBody.description ?? null,
  );
  TestValidator.equals(
    "is_enabled field should reflect updated value",
    updatedRule.is_enabled,
    updateBody.is_enabled,
  );
  TestValidator.equals(
    "applies_to_countries field should reflect updated value",
    updatedRule.applies_to_countries ?? null,
    updateBody.applies_to_countries ?? null,
  );
  TestValidator.equals(
    "effective_from field should reflect updated value",
    updatedRule.effective_from ?? null,
    updateBody.effective_from ?? null,
  );
  TestValidator.equals(
    "effective_until field should reflect updated value",
    updatedRule.effective_until ?? null,
    updateBody.effective_until ?? null,
  );
}
