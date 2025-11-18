import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

export async function test_api_admin_risk_rule_update_disable_rule(
  connection: api.IConnection,
) {
  // 1. Admin join (bootstrap authentication context)
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed an active risk rule with effective window including now
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const ruleCode = `autotest_disable_rule_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    rule_code: ruleCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "order",
    severity: "high",
    expression_json: JSON.stringify({
      type: "threshold",
      field: "order_amount",
      operator: ">",
      value: 100000,
    }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_enabled: true,
    applies_to_countries: JSON.stringify(["KR", "US"]),
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createBody,
    });
  typia.assert(createdRule);

  // Capture baseline audit and configuration fields
  const originalId = createdRule.id;
  const originalRuleCode = createdRule.rule_code;
  const originalExpressionJson = createdRule.expression_json;
  const originalCreatedAt = createdRule.created_at;
  const originalUpdatedAt = createdRule.updated_at;
  const originalDeletedAt = createdRule.deleted_at ?? null;
  const originalIsEnabled = createdRule.is_enabled;

  TestValidator.predicate(
    "newly created rule must start as enabled",
    originalIsEnabled === true,
  );

  // 3. Disable the rule via update, adjusting description
  const newDescription = `${createdRule.description ?? ""} [disabled by e2e test]`;
  const updateBody = {
    is_enabled: false,
    description: newDescription,
  } satisfies IShoppingMallRiskRule.IUpdate;

  const updatedRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.update(connection, {
      ruleCode: originalRuleCode,
      body: updateBody,
    });
  typia.assert(updatedRule);

  // 4. Business and audit validations
  TestValidator.equals(
    "rule code remains unchanged after disable update",
    updatedRule.rule_code,
    originalRuleCode,
  );

  TestValidator.equals(
    "id remains unchanged after disable update",
    updatedRule.id,
    originalId,
  );

  TestValidator.equals(
    "expression_json remains unchanged after disable update",
    updatedRule.expression_json,
    originalExpressionJson,
  );

  TestValidator.equals(
    "created_at remains unchanged after disable update",
    updatedRule.created_at,
    originalCreatedAt,
  );

  const updatedDeletedAt = updatedRule.deleted_at ?? null;
  TestValidator.equals(
    "deleted_at remains null when rule is disabled (not deleted)",
    updatedDeletedAt,
    null,
  );

  TestValidator.equals(
    "rule becomes disabled after update",
    updatedRule.is_enabled,
    false,
  );

  // updated_at should be the same or later than original; prefer later but allow equality
  const originalUpdatedTime = new Date(originalUpdatedAt).getTime();
  const updatedUpdatedTime = new Date(updatedRule.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is advanced or equal after disable update",
    updatedUpdatedTime >= originalUpdatedTime,
  );

  // If we changed description, ensure it matches the new value
  TestValidator.equals(
    "description reflects disabled note after update",
    updatedRule.description ?? null,
    newDescription,
  );
}
