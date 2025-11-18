import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

export async function test_api_admin_risk_rule_delete_idempotency_for_already_deleted_rule(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new risk rule with unique rule_code
  const ruleCode: string = `e2e_rule_${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    rule_code: ruleCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    scope: RandomGenerator.pick([
      "account",
      "order",
      "payment",
      "seller",
      "session",
    ] as const),
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    expression_json: JSON.stringify({
      type: "threshold",
      field: "order_amount",
      operator: ">",
      value: 100000,
      windowMinutes: 10,
    }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_enabled: true,
    applies_to_countries: JSON.stringify(["KR", "US"]),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createBody,
    });
  typia.assert(createdRule);

  // Sanity checks on created rule
  TestValidator.equals(
    "created rule_code should match input",
    createdRule.rule_code,
    ruleCode,
  );
  TestValidator.predicate(
    "created rule should be enabled before deletion",
    createdRule.is_enabled === true,
  );

  // 3. First DELETE: logically retire the rule
  const retiredRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.erase(connection, {
      ruleCode,
    });
  typia.assert(retiredRule);

  // Validate logical retirement semantics
  TestValidator.equals(
    "retired rule_code should still match",
    retiredRule.rule_code,
    createdRule.rule_code,
  );
  TestValidator.predicate(
    "retired rule should be disabled (is_enabled === false)",
    retiredRule.is_enabled === false,
  );
  TestValidator.predicate(
    "retired rule should have non-null deleted_at",
    retiredRule.deleted_at !== null && retiredRule.deleted_at !== undefined,
  );

  // 4. Second DELETE: idempotency / not-found style behavior for already retired rule
  await TestValidator.httpError(
    "second delete on already retired rule should result in http error (not-found style)",
    [400, 404, 410],
    async () => {
      await api.functional.shoppingMall.admin.riskRules.erase(connection, {
        ruleCode,
      });
    },
  );
}
