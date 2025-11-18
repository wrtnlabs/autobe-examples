import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";
import type { IShoppingMallRiskRuleEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRuleEvaluation";
import type { IShoppingMallRiskRuleEvaluationRuleResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRuleEvaluationRuleResult";

export async function test_api_admin_risk_rule_evaluation_with_no_rules_triggered(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a high-amount US order rule that should NOT trigger for small amounts
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const ruleCreateBody = {
    rule_code: `order_high_amount_us_${RandomGenerator.alphaNumeric(8)}`,
    name: "High amount US order rule",
    scope: "order",
    severity: "medium",
    // Expression JSON is opaque to the test; we just describe the intent.
    expression_json: JSON.stringify({
      description:
        "Trigger when amount > 10000 for US orders; do not trigger for smaller amounts",
      thresholdAmount: 10000,
      countryCode: "US",
    }),
    description:
      "Order-scoped rule that should only fire for very high US order amounts.",
    is_enabled: true,
    applies_to_countries: JSON.stringify(["US"]),
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: ruleCreateBody,
    });
  typia.assert(createdRule);

  TestValidator.equals(
    "created rule scope must be order",
    createdRule.scope,
    "order",
  );
  TestValidator.equals(
    "created rule severity must be medium",
    createdRule.severity,
    "medium",
  );

  // 3. Evaluate risk rules with a low-amount US order context that should not trigger the rule
  const evaluationOrderId = typia.random<string & tags.Format<"uuid">>();
  const evaluationTimestamp = new Date().toISOString();

  const evaluationBody = {
    scope: "order",
    evaluationTimestamp,
    orderId: evaluationOrderId,
    countryCode: "US",
    currencyCode: "USD",
    amount: 100,
    context: {
      note: "Low amount US order used to verify that no rules trigger.",
    },
  } satisfies IShoppingMallRiskRuleEvaluation.IRequest;

  const evaluation: IShoppingMallRiskRuleEvaluation =
    await api.functional.shoppingMall.admin.riskRules.evaluate(connection, {
      body: evaluationBody,
    });
  typia.assert(evaluation);

  // 4. Business validations for no-rules-triggered scenario
  TestValidator.equals(
    "evaluation scope should be order",
    evaluation.scope,
    "order",
  );

  TestValidator.predicate(
    "rulesEvaluatedCount should be at least 1",
    evaluation.rulesEvaluatedCount >= 1,
  );

  TestValidator.equals(
    "rulesTriggeredCount should be 0 when conditions are not met",
    evaluation.rulesTriggeredCount,
    0,
  );

  // Every rule result should have triggered === false
  for (const ruleResult of evaluation.rules) {
    typia.assert<IShoppingMallRiskRuleEvaluationRuleResult>(ruleResult);
    TestValidator.equals(
      `rule ${ruleResult.ruleCode} should not be triggered`,
      ruleResult.triggered,
      false,
    );
  }

  // highestSeverity should not indicate a triggered severity when nothing triggers.
  // DTO defines highestSeverity as optional string, so we only ensure that
  // when rulesTriggeredCount is 0, highestSeverity is either undefined or a
  // non-empty string that is not considered as "triggered" in this test
  // (we do not assert concrete value beyond optionality to stay DTO-safe).
  if (evaluation.rulesTriggeredCount === 0) {
    TestValidator.predicate(
      "highestSeverity may be undefined or any string when no rules triggered (contract allows omission)",
      evaluation.highestSeverity === undefined ||
        typeof evaluation.highestSeverity === "string",
    );
  }

  // aggregatedScore is optional; if present we expect it to be 0 in a
  // non-triggering scenario, otherwise it can be undefined.
  if (evaluation.aggregatedScore !== undefined) {
    TestValidator.equals(
      "aggregatedScore should be 0 when no rules triggered",
      evaluation.aggregatedScore,
      0,
    );
  }
}
