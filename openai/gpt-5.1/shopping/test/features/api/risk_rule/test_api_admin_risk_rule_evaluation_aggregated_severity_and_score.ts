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

export async function test_api_admin_risk_rule_evaluation_aggregated_severity_and_score(
  connection: api.IConnection,
) {
  /**
   * Validate aggregated risk evaluation behavior for order-scoped rules.
   *
   * Business intent:
   *
   * - Ensure that when multiple order-scoped rules with different severities
   *   (low, medium, critical) all match the same evaluation context, the
   *   engine:
   *
   *   - Evaluates and returns all rules
   *   - Marks each as triggered
   *   - Preserves configured severities per rule
   *   - Sets highestSeverity to the maximum severity among triggered rules
   *   - Computes aggregatedScore (if used) in a way that is at least as large as
   *       the greatest individual scoreContribution and increases when more
   *       rules trigger.
   *
   * High-level steps:
   *
   * 1. Join an admin via POST /auth/admin/join (SDK call).
   * 2. Create three active order-scoped rules with severities low/medium/critical.
   * 3. Evaluate risk rules with an order-scoped context that should satisfy all
   *    three rules.
   * 4. Assert per-rule results, highestSeverity and aggregatedScore behavior.
   */

  // 1. Admin join (authentication context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create three order-scoped rules with increasing severities.
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const baseRuleExpression = JSON.stringify({
    match: "always",
    scope: "order",
  });

  const ruleLowBody = {
    rule_code: `ORDER_LOW_ALWAYS_${RandomGenerator.alphaNumeric(8)}`,
    name: "Order low severity always-match rule",
    scope: "order",
    severity: "low",
    expression_json: baseRuleExpression,
    description: "Low-severity order rule that always triggers for tests.",
    is_enabled: true,
    applies_to_countries: null,
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const ruleMediumBody = {
    rule_code: `ORDER_MED_ALWAYS_${RandomGenerator.alphaNumeric(8)}`,
    name: "Order medium severity always-match rule",
    scope: "order",
    severity: "medium",
    expression_json: baseRuleExpression,
    description: "Medium-severity order rule that always triggers for tests.",
    is_enabled: true,
    applies_to_countries: null,
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const ruleCriticalBody = {
    rule_code: `ORDER_CRIT_ALWAYS_${RandomGenerator.alphaNumeric(8)}`,
    name: "Order critical severity always-match rule",
    scope: "order",
    severity: "critical",
    expression_json: baseRuleExpression,
    description:
      "Critical-severity order rule that always triggers for aggregation tests.",
    is_enabled: true,
    applies_to_countries: null,
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdLow: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: ruleLowBody,
    });
  typia.assert<IShoppingMallRiskRule>(createdLow);

  const createdMedium: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: ruleMediumBody,
    });
  typia.assert<IShoppingMallRiskRule>(createdMedium);

  const createdCritical: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: ruleCriticalBody,
    });
  typia.assert<IShoppingMallRiskRule>(createdCritical);

  // 3. Evaluate risk for an order-scoped context.
  const evaluationOrderId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  const evaluationTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const evaluationRequest = {
    scope: "order",
    evaluationTimestamp,
    orderId: evaluationOrderId,
    amount: 1000,
    currencyCode: "KRW",
    countryCode: "KR",
    context: {
      ruleSet: "always",
      entity: "order",
    },
  } satisfies IShoppingMallRiskRuleEvaluation.IRequest;

  const evaluation: IShoppingMallRiskRuleEvaluation =
    await api.functional.shoppingMall.admin.riskRules.evaluate(connection, {
      body: evaluationRequest,
    });
  typia.assert<IShoppingMallRiskRuleEvaluation>(evaluation);

  // 4. Validate evaluation results.
  TestValidator.predicate(
    "rulesEvaluatedCount should be at least 3",
    evaluation.rulesEvaluatedCount >= 3,
  );

  TestValidator.predicate(
    "rulesTriggeredCount should be at least 3",
    evaluation.rulesTriggeredCount >= 3,
  );

  const ruleResultsByCode: Record<
    string,
    IShoppingMallRiskRuleEvaluationRuleResult
  > = {};
  for (const r of evaluation.rules) {
    ruleResultsByCode[r.ruleCode] = r;
  }

  const lowResult = ruleResultsByCode[createdLow.rule_code];
  const mediumResult = ruleResultsByCode[createdMedium.rule_code];
  const criticalResult = ruleResultsByCode[createdCritical.rule_code];

  TestValidator.predicate("low severity rule result should exist", !!lowResult);
  TestValidator.predicate(
    "medium severity rule result should exist",
    !!mediumResult,
  );
  TestValidator.predicate(
    "critical severity rule result should exist",
    !!criticalResult,
  );

  if (lowResult) {
    TestValidator.predicate(
      "low severity rule should be triggered",
      lowResult.triggered === true,
    );
    TestValidator.equals(
      "low severity rule severity preserved",
      lowResult.severity,
      createdLow.severity,
    );
  }

  if (mediumResult) {
    TestValidator.predicate(
      "medium severity rule should be triggered",
      mediumResult.triggered === true,
    );
    TestValidator.equals(
      "medium severity rule severity preserved",
      mediumResult.severity,
      createdMedium.severity,
    );
  }

  if (criticalResult) {
    TestValidator.predicate(
      "critical severity rule should be triggered",
      criticalResult.triggered === true,
    );
    TestValidator.equals(
      "critical severity rule severity preserved",
      criticalResult.severity,
      createdCritical.severity,
    );
  }

  TestValidator.equals(
    "highestSeverity should be critical when critical rule triggers",
    evaluation.highestSeverity,
    createdCritical.severity,
  );

  if (evaluation.aggregatedScore !== undefined) {
    const triggeredWithScore = evaluation.rules.filter(
      (r) => r.triggered && r.scoreContribution !== undefined,
    );

    if (triggeredWithScore.length > 0) {
      const maxScoreContribution = triggeredWithScore.reduce(
        (acc, r) =>
          r.scoreContribution !== undefined && r.scoreContribution > acc
            ? r.scoreContribution
            : acc,
        triggeredWithScore[0].scoreContribution as number,
      );

      TestValidator.predicate(
        "aggregatedScore should be at least maximum scoreContribution",
        evaluation.aggregatedScore >= maxScoreContribution,
      );
    }
  }
}
