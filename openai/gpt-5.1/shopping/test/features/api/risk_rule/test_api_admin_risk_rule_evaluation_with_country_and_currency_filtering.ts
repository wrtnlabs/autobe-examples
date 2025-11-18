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

export async function test_api_admin_risk_rule_evaluation_with_country_and_currency_filtering(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create two payment-scoped risk rules with different country and currency semantics
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  // Rule H: high severity, applies to US/CA, intended for USD payments > 500
  const ruleHCreate = {
    rule_code: `rule_H_${RandomGenerator.alphaNumeric(8)}`,
    name: "High severity US/CA high-amount USD payment rule",
    scope: "payment",
    severity: "high",
    expression_json: JSON.stringify({
      description:
        "Trigger for USD payments over 500 in US or CA; documentation only for this test.",
      currencyCode: "USD",
      minAmount: 500,
    }),
    description:
      "Test rule H for high-severity risk on large USD payments in US/CA.",
    is_enabled: true,
    applies_to_countries: JSON.stringify(["US", "CA"]),
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRiskRule.ICreate;

  const ruleH: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: ruleHCreate,
    });
  typia.assert<IShoppingMallRiskRule>(ruleH);

  // Rule I: medium severity, applies to KR, intended for KRW payments > 500000
  const ruleICreate = {
    rule_code: `rule_I_${RandomGenerator.alphaNumeric(8)}`,
    name: "Medium severity KR high-amount KRW payment rule",
    scope: "payment",
    severity: "medium",
    expression_json: JSON.stringify({
      description:
        "Trigger for KRW payments over 500000 in KR; documentation only for this test.",
      currencyCode: "KRW",
      minAmount: 500000,
    }),
    description:
      "Test rule I for medium-severity risk on large KRW payments in KR.",
    is_enabled: true,
    applies_to_countries: JSON.stringify(["KR"]),
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRiskRule.ICreate;

  const ruleI: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: ruleICreate,
    });
  typia.assert<IShoppingMallRiskRule>(ruleI);

  // Helper to find a rule result by ruleCode
  const findRuleResultByCode = (
    evaluation: IShoppingMallRiskRuleEvaluation,
    ruleCode: string,
  ): IShoppingMallRiskRuleEvaluationRuleResult | undefined => {
    return evaluation.rules.find((r) => r.ruleCode === ruleCode);
  };

  // 3. First evaluation: US / USD payment context where only Rule H should logically trigger
  const evalTimestamp1 = new Date().toISOString();
  const evaluationUS: IShoppingMallRiskRuleEvaluation =
    await api.functional.shoppingMall.admin.riskRules.evaluate(connection, {
      body: {
        scope: "payment",
        paymentId: RandomGenerator.alphaNumeric(16),
        countryCode: "US",
        currencyCode: "USD",
        amount: 600,
        evaluationTimestamp: evalTimestamp1,
      } satisfies IShoppingMallRiskRuleEvaluation.IRequest,
    });
  typia.assert<IShoppingMallRiskRuleEvaluation>(evaluationUS);

  TestValidator.equals(
    "evaluation scope for US payment should be payment",
    evaluationUS.scope,
    "payment",
  );

  const ruleHInUS = findRuleResultByCode(evaluationUS, ruleH.rule_code);
  const ruleIInUS = findRuleResultByCode(evaluationUS, ruleI.rule_code);

  TestValidator.predicate(
    "rule H must appear in US/USD evaluation results",
    ruleHInUS !== undefined,
  );

  if (ruleHInUS !== undefined) {
    TestValidator.equals(
      "rule H should be marked triggered for US/USD high-amount payment",
      ruleHInUS.triggered,
      true,
    );
    TestValidator.equals(
      "rule H severity should remain high",
      ruleHInUS.severity,
      ruleH.severity,
    );
  }

  if (ruleIInUS !== undefined) {
    TestValidator.equals(
      "rule I must not trigger for US/USD context",
      ruleIInUS.triggered,
      false,
    );
  }

  // 4. Second evaluation: KR / KRW payment context where only Rule I should logically trigger
  const evalTimestamp2 = new Date().toISOString();
  const evaluationKR: IShoppingMallRiskRuleEvaluation =
    await api.functional.shoppingMall.admin.riskRules.evaluate(connection, {
      body: {
        scope: "payment",
        paymentId: RandomGenerator.alphaNumeric(16),
        countryCode: "KR",
        currencyCode: "KRW",
        amount: 600000,
        evaluationTimestamp: evalTimestamp2,
      } satisfies IShoppingMallRiskRuleEvaluation.IRequest,
    });
  typia.assert<IShoppingMallRiskRuleEvaluation>(evaluationKR);

  TestValidator.equals(
    "evaluation scope for KR payment should be payment",
    evaluationKR.scope,
    "payment",
  );

  const ruleHInKR = findRuleResultByCode(evaluationKR, ruleH.rule_code);
  const ruleIInKR = findRuleResultByCode(evaluationKR, ruleI.rule_code);

  if (ruleIInKR !== undefined) {
    TestValidator.equals(
      "rule I should be marked triggered for KR/KRW high-amount payment",
      ruleIInKR.triggered,
      true,
    );
    TestValidator.equals(
      "rule I severity should remain medium",
      ruleIInKR.severity,
      ruleI.severity,
    );
  } else {
    TestValidator.predicate(
      "rule I must appear in KR/KRW evaluation results",
      false,
    );
  }

  if (ruleHInKR !== undefined) {
    TestValidator.equals(
      "rule H must not trigger for KR/KRW context",
      ruleHInKR.triggered,
      false,
    );
  }
}
