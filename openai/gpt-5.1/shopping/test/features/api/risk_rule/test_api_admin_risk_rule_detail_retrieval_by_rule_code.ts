import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

export async function test_api_admin_risk_rule_detail_retrieval_by_rule_code(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional; omit to let backend derive it or keep null
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a concrete risk rule with known configuration
  const ruleCodePrefix = "risk_rule_";
  const randomSuffix = RandomGenerator.alphaNumeric(8);
  const ruleCode = `${ruleCodePrefix}${randomSuffix}`;

  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

  const effectiveFrom = now.toISOString();
  const effectiveUntil = later.toISOString();

  const appliesCountries = JSON.stringify(["US", "KR"]);

  const createBody = {
    rule_code: ruleCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    scope: RandomGenerator.pick(["order", "payment", "account"] as const),
    severity: RandomGenerator.pick(["low", "medium", "high"] as const),
    expression_json: JSON.stringify({
      threshold: 5,
      windowMinutes: 30,
      metric: "orders_per_hour",
    }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_enabled: true,
    applies_to_countries: appliesCountries,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createBody,
    });
  typia.assert(createdRule);

  // 3. Retrieve the rule by its rule_code via path parameter
  const fetchedRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.at(connection, {
      ruleCode: ruleCode,
    });
  typia.assert(fetchedRule);

  // 4. Field-by-field equality assertions
  TestValidator.equals(
    "rule_code should match between created and fetched rule",
    fetchedRule.rule_code,
    createdRule.rule_code,
  );

  TestValidator.equals(
    "name should match between created and fetched rule",
    fetchedRule.name,
    createdRule.name,
  );

  TestValidator.equals(
    "scope should match between created and fetched rule",
    fetchedRule.scope,
    createdRule.scope,
  );

  TestValidator.equals(
    "severity should match between created and fetched rule",
    fetchedRule.severity,
    createdRule.severity,
  );

  TestValidator.equals(
    "expression_json should match between created and fetched rule",
    fetchedRule.expression_json,
    createdRule.expression_json,
  );

  TestValidator.equals(
    "description should match between created and fetched rule",
    fetchedRule.description ?? null,
    createdRule.description ?? null,
  );

  TestValidator.equals(
    "is_enabled should match between created and fetched rule",
    fetchedRule.is_enabled,
    createdRule.is_enabled,
  );

  TestValidator.equals(
    "applies_to_countries should match between created and fetched rule",
    fetchedRule.applies_to_countries ?? null,
    createdRule.applies_to_countries ?? null,
  );

  TestValidator.equals(
    "effective_from should match between created and fetched rule",
    fetchedRule.effective_from ?? null,
    createdRule.effective_from ?? null,
  );

  TestValidator.equals(
    "effective_until should match between created and fetched rule",
    fetchedRule.effective_until ?? null,
    createdRule.effective_until ?? null,
  );

  // Timestamps and id invariants
  TestValidator.predicate(
    "created rule id should be a non-empty string",
    typeof createdRule.id === "string" && createdRule.id.length > 0,
  );

  TestValidator.equals(
    "id should match between created and fetched rule",
    fetchedRule.id,
    createdRule.id,
  );

  TestValidator.predicate(
    "created_at should be equal between created and fetched rule",
    fetchedRule.created_at === createdRule.created_at,
  );

  TestValidator.predicate(
    "updated_at of fetched rule should be greater than or equal to created_at",
    new Date(fetchedRule.updated_at).getTime() >=
      new Date(fetchedRule.created_at).getTime(),
  );

  TestValidator.equals(
    "deleted_at should be null for newly created rule",
    fetchedRule.deleted_at ?? null,
    createdRule.deleted_at ?? null,
  );
}
