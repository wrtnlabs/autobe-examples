import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

export async function test_api_admin_risk_rule_update_effective_window_and_scope(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish admin authentication context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin.e2e-test.local/join",
    referrer: "https://admin.e2e-test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a baseline risk rule with initial scope and effective window.
  const now = new Date();
  const baselineEffectiveFrom = new Date(
    now.getTime() - 5 * 60 * 1000,
  ).toISOString();
  const baselineEffectiveUntil = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString();

  const ruleCode = `e2e_effective_window_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    rule_code: ruleCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "order",
    severity: "medium",
    expression_json: JSON.stringify({
      scope: "order",
      condition: "order.amount > 100000",
      window_minutes: 15,
    }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_enabled: true,
    applies_to_countries: JSON.stringify(["KR", "US"]),
    effective_from: baselineEffectiveFrom,
    effective_until: baselineEffectiveUntil,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallRiskRule>(createdRule);

  // Basic sanity checks on created rule
  TestValidator.equals(
    "created rule_code should match input",
    createdRule.rule_code,
    ruleCode,
  );
  TestValidator.equals(
    "created scope should be 'order'",
    createdRule.scope,
    "order",
  );
  TestValidator.equals(
    "created effective_from should match baseline",
    createdRule.effective_from!,
    baselineEffectiveFrom,
  );
  TestValidator.equals(
    "created effective_until should match baseline",
    createdRule.effective_until!,
    baselineEffectiveUntil,
  );

  // 3. Update the risk rule: change scope and extend effective window.
  const updatedEffectiveFrom = new Date(
    now.getTime() - 10 * 60 * 1000,
  ).toISOString();
  const updatedEffectiveUntil = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString();

  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedExpressionJson = JSON.stringify({
    scope: "payment",
    condition: "payment.card_country != customer.country",
    window_minutes: 30,
  });

  const updateBody = {
    scope: "payment",
    severity: "high",
    expression_json: updatedExpressionJson,
    description: updatedDescription,
    is_enabled: true,
    applies_to_countries: JSON.stringify(["KR"]),
    effective_from: updatedEffectiveFrom,
    effective_until: updatedEffectiveUntil,
  } satisfies IShoppingMallRiskRule.IUpdate;

  const updatedRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.update(connection, {
      ruleCode,
      body: updateBody,
    });
  typia.assert<IShoppingMallRiskRule>(updatedRule);

  // 4. Assertions on identity stability and updated attributes.
  TestValidator.equals(
    "id must remain stable after update",
    updatedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "rule_code must remain stable after update",
    updatedRule.rule_code,
    createdRule.rule_code,
  );

  TestValidator.equals(
    "scope must be updated to payment",
    updatedRule.scope,
    "payment",
  );
  TestValidator.equals(
    "severity must be updated to high",
    updatedRule.severity,
    "high",
  );
  TestValidator.equals(
    "description must reflect updated description",
    updatedRule.description!,
    updatedDescription,
  );
  TestValidator.equals(
    "expression_json must reflect updated payment expression",
    updatedRule.expression_json,
    updatedExpressionJson,
  );
  TestValidator.equals(
    "applies_to_countries must be updated to KR only",
    updatedRule.applies_to_countries!,
    JSON.stringify(["KR"]),
  );

  TestValidator.equals(
    "is_enabled remains true after update",
    updatedRule.is_enabled,
    true,
  );

  TestValidator.equals(
    "effective_from must be updated to new value",
    updatedRule.effective_from!,
    updatedEffectiveFrom,
  );
  TestValidator.equals(
    "effective_until must be extended to new value",
    updatedRule.effective_until!,
    updatedEffectiveUntil,
  );

  TestValidator.equals(
    "deleted_at must remain null after update",
    updatedRule.deleted_at ?? null,
    null,
  );

  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedRule.created_at,
    createdRule.created_at,
  );

  TestValidator.predicate("updated_at must be >= created updated_at", () => {
    const createdUpdatedAt = new Date(createdRule.updated_at).getTime();
    const updatedUpdatedAt = new Date(updatedRule.updated_at).getTime();
    return updatedUpdatedAt >= createdUpdatedAt;
  });

  // 5. Logical reasoning about active configuration window.
  TestValidator.predicate(
    "rule should be logically active: enabled and now within effective window",
    () => {
      if (!updatedRule.is_enabled) return false;
      if (
        updatedRule.effective_from == null ||
        updatedRule.effective_until == null
      )
        return false;

      const nowMs = now.getTime();
      const fromMs = new Date(updatedRule.effective_from).getTime();
      const untilMs = new Date(updatedRule.effective_until).getTime();
      return fromMs <= nowMs && nowMs <= untilMs;
    },
  );
}
