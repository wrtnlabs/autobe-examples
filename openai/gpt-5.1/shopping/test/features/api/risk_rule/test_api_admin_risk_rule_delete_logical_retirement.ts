import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

export async function test_api_admin_risk_rule_delete_logical_retirement(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated admin context
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
  typia.assert(adminAuthorized);

  // 2. Create an active risk rule
  const ruleCode: string = `e2e_soft_delete_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    rule_code: ruleCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "order",
    severity: "high",
    expression_json: JSON.stringify({ threshold: 5, windowMinutes: 60 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_enabled: true,
    applies_to_countries: '["US","KR"]',
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createBody,
    });
  typia.assert(createdRule);

  TestValidator.equals(
    "created rule_code matches input",
    createdRule.rule_code,
    ruleCode,
  );
  TestValidator.equals(
    "created is_enabled is true",
    createdRule.is_enabled,
    true,
  );
  TestValidator.equals(
    "created deleted_at is null",
    createdRule.deleted_at ?? null,
    null,
  );

  // 3. Logically retire the risk rule via DELETE
  const retiredRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.erase(connection, {
      ruleCode: createdRule.rule_code,
    });
  typia.assert(retiredRule);

  // 4. Validate logical retirement behavior
  TestValidator.predicate(
    "deleted_at is non-null after logical retirement",
    retiredRule.deleted_at !== null && retiredRule.deleted_at !== undefined,
  );

  TestValidator.equals(
    "is_enabled is forced to false after logical retirement",
    retiredRule.is_enabled,
    false,
  );

  TestValidator.equals(
    "id unchanged after logical retirement",
    retiredRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "rule_code unchanged after logical retirement",
    retiredRule.rule_code,
    createdRule.rule_code,
  );
  TestValidator.equals(
    "name unchanged after logical retirement",
    retiredRule.name,
    createdRule.name,
  );
  TestValidator.equals(
    "scope unchanged after logical retirement",
    retiredRule.scope,
    createdRule.scope,
  );
  TestValidator.equals(
    "expression_json unchanged after logical retirement",
    retiredRule.expression_json,
    createdRule.expression_json,
  );

  TestValidator.notEquals(
    "updated_at changed after logical retirement",
    retiredRule.updated_at,
    createdRule.updated_at,
  );
}
