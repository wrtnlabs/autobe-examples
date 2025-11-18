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

export async function test_api_admin_risk_rule_evaluation_filtered_by_scope(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create two risk rules with different scopes: order (Rule C) and payment (Rule D)
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const orderRuleCode = `order_scope_rule_${RandomGenerator.alphaNumeric(8)}`;
  const paymentRuleCode = `payment_scope_rule_${RandomGenerator.alphaNumeric(8)}`;

  const orderRuleBody = {
    rule_code: orderRuleCode,
    name: "Order scope test rule",
    scope: "order",
    severity: "medium",
    expression_json: JSON.stringify({
      alwaysTrigger: true,
      scope: "order",
    }),
    description: "Rule that should always trigger for order scope tests",
    is_enabled: true,
    applies_to_countries: null,
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const paymentRuleBody = {
    rule_code: paymentRuleCode,
    name: "Payment scope test rule",
    scope: "payment",
    severity: "high",
    expression_json: JSON.stringify({
      alwaysTrigger: true,
      scope: "payment",
    }),
    description: "Rule that should always trigger for payment scope tests",
    is_enabled: true,
    applies_to_countries: null,
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdOrderRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: orderRuleBody,
    });
  typia.assert(createdOrderRule);

  const createdPaymentRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: paymentRuleBody,
    });
  typia.assert(createdPaymentRule);

  // 3. Evaluate with an order context; only order-scoped rules should be considered
  const orderContextId = typia.random<string & tags.Format<"uuid">>();

  const evaluationRequest = {
    scope: "order",
    evaluationTimestamp: nowIso,
    orderId: orderContextId,
    paymentId: undefined,
    accountId: undefined,
    sellerId: undefined,
    sessionId: undefined,
    countryCode: "KR",
    currencyCode: "KRW",
    amount: 12345,
    ipAddress: "127.0.0.1",
    userAgent: "E2E-Test-Agent/1.0",
    context: {
      testCase: "filter_by_scope",
      orderRuleCode,
      paymentRuleCode,
    },
  } satisfies IShoppingMallRiskRuleEvaluation.IRequest;

  const evaluation: IShoppingMallRiskRuleEvaluation =
    await api.functional.shoppingMall.admin.riskRules.evaluate(connection, {
      body: evaluationRequest,
    });
  typia.assert(evaluation);

  // 4. Validate that only order-scoped rules were evaluated and triggered
  TestValidator.equals(
    "evaluation scope should be order",
    evaluation.scope,
    "order",
  );

  TestValidator.equals(
    "rulesEvaluatedCount should be 1 (only order rule)",
    evaluation.rulesEvaluatedCount,
    1,
  );

  TestValidator.equals(
    "rulesTriggeredCount should be 1 for order scope",
    evaluation.rulesTriggeredCount,
    1,
  );

  TestValidator.equals(
    "highestSeverity should match order rule severity",
    evaluation.highestSeverity,
    createdOrderRule.severity,
  );

  // There must be at least one rule result
  TestValidator.predicate(
    "evaluation.rules should not be empty",
    evaluation.rules.length > 0,
  );

  // All evaluated rules must have scope === "order" and no payment-scoped rule present
  for (const ruleResult of evaluation.rules) {
    TestValidator.equals(
      "each evaluated rule should have order scope",
      ruleResult.scope,
      "order",
    );

    TestValidator.notEquals(
      "no evaluated rule should have payment scope",
      ruleResult.scope,
      "payment",
    );
  }

  // Find the triggered rule result and ensure it matches the created order rule
  const triggeredRule = evaluation.rules.find((r) => r.triggered === true);

  TestValidator.predicate(
    "there should be a triggered rule",
    triggeredRule !== undefined,
  );

  if (triggeredRule !== undefined) {
    TestValidator.equals(
      "triggered rule should match created order rule code",
      triggeredRule.ruleCode,
      createdOrderRule.rule_code,
    );

    TestValidator.equals(
      "triggered rule scope should be order",
      triggeredRule.scope,
      createdOrderRule.scope,
    );

    TestValidator.equals(
      "triggered rule severity should be medium",
      triggeredRule.severity,
      createdOrderRule.severity,
    );
  }
}
