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

/**
 * Validate evaluation of a single high-severity order-scoped risk rule.
 *
 * Business goal:
 *
 * - Ensure that when an admin creates an active high-severity rule for `scope =
 *   "order"`, and the admin later invokes the risk evaluation endpoint with a
 *   matching order context, the rule is evaluated and actually triggers, and
 *   the aggregate evaluation correctly reflects the high severity.
 *
 * End-to-end steps:
 *
 * 1. Join as an admin using POST /auth/admin/join.
 *
 *    - This both creates an admin account and sets the Authorization header on the
 *         shared connection for subsequent admin-only operations.
 * 2. As that admin, create a single risk rule using POST
 *    /shoppingMall/admin/riskRules with:
 *
 *    - Scope: "order"
 *    - Severity: "high"
 *    - Rule_code: unique random string for this test run
 *    - Name: descriptive test name
 *    - Expression_json: JSON text that (by contract) will inspect amount and
 *         countryCode. The exact semantics are implementation-specific, so the
 *         test stores a structured JSON, but does not attempt to interpret it.
 *    - Is_enabled: true
 *    - Applies_to_countries: JSON array text including "US"
 *    - Effective_from: a timestamp in the past
 *    - Effective_until: null so the rule is active indefinitely.
 * 3. Call PATCH /shoppingMall/admin/riskRules/evaluate with
 *    IShoppingMallRiskRuleEvaluation.IRequest body containing:
 *
 *    - Scope: "order"
 *    - OrderId: synthetic order identifier string
 *    - CountryCode: "US"
 *    - CurrencyCode: "USD"
 *    - Amount: a numeric value above the threshold encoded in our JSON, e.g., 1500
 *    - EvaluationTimestamp: a date-time within the rule’s effective window, here
 *         simply the current time
 *    - Context: additional attributes such as { orderChannel: "web" } just to
 *         exercise the context shape.
 * 4. Validate the evaluation response:
 *
 *    - Typia.assert on IShoppingMallRiskRuleEvaluation for structural correctness.
 *    - Scope must equal "order".
 *    - RulesEvaluatedCount >= 1.
 *    - RulesTriggeredCount >= 1 (our high-severity rule should trigger).
 *    - There must exist at least one ruleResult whose:
 *
 *         - RuleCode equals the created rule_code.
 *         - Triggered is true.
 *         - Severity is "high".
 *    - HighestSeverity must be "high" to reflect that the triggered rule is high
 *         severity.
 *    - If aggregatedScore is present (not undefined), assert that it is greater than
 *         0 to reflect positive contribution from the triggered rule. If it is
 *         undefined, skip this assertion.
 *    - All rules in the response must have scope === "order" so that rules from
 *         other scopes are not evaluated for this request.
 */
export async function test_api_admin_risk_rule_evaluation_with_single_high_severity_rule(
  connection: api.IConnection,
) {
  // 1. Join as admin: create admin actor and obtain tokens via SDK side-effect.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    // For ip, we can either provide valid ipv4/ipv6 or omit; here we omit so it stays undefined.
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a single high-severity order-scoped risk rule.
  const ruleCode = `e2e_high_order_rule_${RandomGenerator.alphaNumeric(12)}`;

  const effectiveFrom = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const createRuleBody = {
    rule_code: ruleCode,
    name: "E2E High Severity Order Rule",
    scope: "order",
    severity: "high",
    expression_json: JSON.stringify({
      type: "order_threshold",
      minAmount: 1000,
      country: "US",
    }),
    description: "High severity rule for US orders above 1000",
    is_enabled: true,
    applies_to_countries: JSON.stringify(["US"]),
    effective_from: effectiveFrom,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdRule = await api.functional.shoppingMall.admin.riskRules.create(
    connection,
    { body: createRuleBody },
  );
  typia.assert<IShoppingMallRiskRule>(createdRule);

  TestValidator.equals(
    "created rule code must match requested rule_code",
    createdRule.rule_code,
    ruleCode,
  );
  TestValidator.equals(
    "created rule scope must be order",
    createdRule.scope,
    "order",
  );
  TestValidator.equals(
    "created rule severity must be high",
    createdRule.severity,
    "high",
  );

  // 3. Evaluate risk rules for an order context that should trigger the rule.
  const evaluationTimestamp = new Date().toISOString();

  const evaluateBody = {
    scope: "order",
    orderId: `ORDER-${RandomGenerator.alphaNumeric(10)}`,
    countryCode: "US",
    currencyCode: "USD",
    amount: 1500,
    evaluationTimestamp,
    context: {
      orderChannel: "web",
    },
  } satisfies IShoppingMallRiskRuleEvaluation.IRequest;

  const evaluation = await api.functional.shoppingMall.admin.riskRules.evaluate(
    connection,
    { body: evaluateBody },
  );
  typia.assert<IShoppingMallRiskRuleEvaluation>(evaluation);

  // 4. Business-level assertions on evaluation result.
  TestValidator.equals(
    "evaluation scope must be order",
    evaluation.scope,
    "order",
  );

  TestValidator.predicate(
    "rulesEvaluatedCount must be >= 1",
    evaluation.rulesEvaluatedCount >= 1,
  );

  TestValidator.predicate(
    "rulesTriggeredCount must be >= 1",
    evaluation.rulesTriggeredCount >= 1,
  );

  TestValidator.predicate(
    "there must be at least one rule result",
    evaluation.rules.length >= 1,
  );

  const matchedRule: IShoppingMallRiskRuleEvaluationRuleResult | undefined =
    evaluation.rules.find((rule) => rule.ruleCode === createdRule.rule_code);

  TestValidator.predicate(
    "evaluation must contain result for the created rule",
    matchedRule !== undefined,
  );

  if (matchedRule !== undefined) {
    TestValidator.equals(
      "matched rule scope must be order",
      matchedRule.scope,
      "order",
    );
    TestValidator.equals(
      "matched rule severity must be high",
      matchedRule.severity,
      "high",
    );
    TestValidator.equals(
      "matched rule must be triggered",
      matchedRule.triggered,
      true,
    );
  }

  if (evaluation.highestSeverity !== undefined) {
    TestValidator.equals(
      "highestSeverity must be high when our high-severity rule triggers",
      evaluation.highestSeverity,
      "high",
    );
  }

  if (evaluation.aggregatedScore !== undefined) {
    TestValidator.predicate(
      "aggregatedScore, when present, must be > 0",
      evaluation.aggregatedScore > 0,
    );
  }

  // Ensure all rules in evaluation result are for the same scope (order).
  for (const rule of evaluation.rules) {
    TestValidator.equals(
      "all evaluated rules must have scope order",
      rule.scope,
      "order",
    );
  }
}
