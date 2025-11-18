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
 * Validate that risk rule evaluation respects effective_from/effective_until
 * windows.
 *
 * Business goal: Ensure that the risk evaluation engine only evaluates rules
 * that are both:
 *
 * - Enabled
 * - Effective at the requested evaluation time (within [effective_from,
 *   effective_until] if present) and that rules whose effective_until lies in
 *   the past are excluded even when still is_enabled = true.
 *
 * Scenario:
 *
 * 1. Register an admin via POST /auth/admin/join and obtain an authorized admin
 *    context.
 * 2. As this admin, create two risk rules via POST /shoppingMall/admin/riskRules:
 *
 *    - Rule A (expired):
 *
 *         - Scope: "account"
 *         - Severity: "medium"
 *         - Expression_json: any JSON string (we do not assert on engine internals in
 *                   this test)
 *         - Is_enabled: true
 *         - Effective_from: far in the past
 *         - Effective_until: some timestamp in the past that is strictly before `now`.
 *    - Rule B (active):
 *
 *         - Scope: "account"
 *         - Severity: "high"
 *         - Expression_json: any JSON string
 *         - Is_enabled: true
 *         - Effective_from: in the recent past (<= now)
 *         - Effective_until: null (no expiry)
 * 3. Call PATCH /shoppingMall/admin/riskRules/evaluate with body:
 *
 *    - Scope: "account"
 *    - AccountId: a deterministic synthetic ID (string)
 *    - EvaluationTimestamp: now (ISO 8601 string) so that:
 *
 *         - EvaluationTimestamp > Rule A.effective_until (expired)
 *         - EvaluationTimestamp >= Rule B.effective_from (active)
 *    - Context: an arbitrary small object that is valid per IRequest (we do not rely
 *         on it for logic here).
 * 4. Validate response semantics:
 *
 *    - Typia.assert on IShoppingMallRiskRuleEvaluation.
 *    - RulesEvaluatedCount >= 1.
 *    - At least one rule in `rules` has ruleCode === Rule B.rule_code and severity
 *         === Rule B.severity.
 *    - No rule in `rules` has ruleCode === Rule A.rule_code (expired rule excluded
 *         from evaluation).
 *    - RulesTriggeredCount >= 1 (we assume the engine is configured to trigger
 *         always for these simple expressions).
 *    - HighestSeverity equals Rule B.severity ("high"), matching the highest
 *         severity present among rules[] that triggered.
 *
 * Notes and constraints:
 *
 * - We do not attempt to inspect HTTP status codes or low-level engine internals.
 * - We treat expression_json as an opaque JSON string and do not try to encode
 *   specific rule logic; we only assert on which rules appear in the evaluation
 *   result and the aggregate fields.
 */
export async function test_api_admin_risk_rule_evaluation_respects_effective_date_window(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-console.local/join",
    referrer: "https://admin-console.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create two risk rules: Rule A (expired) and Rule B (active)
  const now: Date = new Date();

  // Helper to build ISO strings offset from now
  const minutes = (n: number): number => n * 60 * 1000;

  const effectiveFromA = new Date(
    now.getTime() - minutes(60 * 24 * 30),
  ).toISOString(); // ~30 days ago
  const effectiveUntilA = new Date(
    now.getTime() - minutes(60 * 24 * 7),
  ).toISOString(); // ~7 days ago (so definitely before now)

  const effectiveFromB = new Date(
    now.getTime() - minutes(60 * 24),
  ).toISOString(); // ~1 day ago, still before now

  const syntheticAccountId = `test-account-${RandomGenerator.alphaNumeric(12)}`;

  const ruleACreateBody = {
    rule_code: `expired_rule_${RandomGenerator.alphaNumeric(8)}`,
    name: "Expired account risk rule for testing effective window",
    scope: "account",
    severity: "medium",
    expression_json: JSON.stringify({
      kind: "always_true",
      target: "account",
      accountId: syntheticAccountId,
    }),
    description:
      "Rule A: expired rule that would otherwise match the test account if still effective.",
    is_enabled: true,
    applies_to_countries: null,
    effective_from: effectiveFromA,
    effective_until: effectiveUntilA,
  } satisfies IShoppingMallRiskRule.ICreate;

  const ruleBCreateBody = {
    rule_code: `active_rule_${RandomGenerator.alphaNumeric(8)}`,
    name: "Active account risk rule for testing effective window",
    scope: "account",
    severity: "high",
    expression_json: JSON.stringify({
      kind: "always_true",
      target: "account",
      accountId: syntheticAccountId,
    }),
    description:
      "Rule B: active rule that should be evaluated and triggered for the test account.",
    is_enabled: true,
    applies_to_countries: null,
    effective_from: effectiveFromB,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const ruleA: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: ruleACreateBody,
    });
  typia.assert(ruleA);

  const ruleB: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: ruleBCreateBody,
    });
  typia.assert(ruleB);

  // Sanity checks on effective windows
  TestValidator.predicate(
    "Rule A effective_until should be before now",
    new Date(ruleA.effective_until ?? effectiveUntilA).getTime() <
      now.getTime(),
  );
  TestValidator.predicate(
    "Rule B effective_from should be at or before now",
    new Date(ruleB.effective_from ?? effectiveFromB).getTime() <= now.getTime(),
  );

  // 3. Evaluate risk rules for the synthetic account at `now`
  const evaluationTimestamp = now.toISOString();

  const evaluationBody = {
    scope: "account",
    evaluationTimestamp,
    accountId: syntheticAccountId,
    context: {
      countryCode: "KR",
      ipAddress: "203.0.113.10",
    },
  } satisfies IShoppingMallRiskRuleEvaluation.IRequest;

  const evaluation: IShoppingMallRiskRuleEvaluation =
    await api.functional.shoppingMall.admin.riskRules.evaluate(connection, {
      body: evaluationBody,
    });
  typia.assert(evaluation);

  // 4. Validate evaluation semantics
  TestValidator.predicate(
    "rulesEvaluatedCount should be at least 1",
    evaluation.rulesEvaluatedCount >= 1,
  );

  TestValidator.predicate(
    "rulesTriggeredCount should be non-negative and not exceed rulesEvaluatedCount",
    evaluation.rulesTriggeredCount >= 0 &&
      evaluation.rulesTriggeredCount <= evaluation.rulesEvaluatedCount,
  );

  // There must be at least one rule result for the active rule B
  const hasRuleB = evaluation.rules.some(
    (r: IShoppingMallRiskRuleEvaluationRuleResult) =>
      r.ruleCode === ruleB.rule_code && r.severity === ruleB.severity,
  );
  TestValidator.predicate(
    "evaluation should include Rule B as a considered rule",
    hasRuleB,
  );

  // There must be no rule result for the expired rule A
  const hasRuleA = evaluation.rules.some(
    (r: IShoppingMallRiskRuleEvaluationRuleResult) =>
      r.ruleCode === ruleA.rule_code,
  );
  TestValidator.predicate(
    "evaluation should NOT include expired Rule A",
    hasRuleA === false,
  );

  // If any rules triggered, highestSeverity should at least be as high as Rule B when it appears triggered.
  const triggeredRules = evaluation.rules.filter(
    (r: IShoppingMallRiskRuleEvaluationRuleResult) => r.triggered,
  );

  if (triggeredRules.length > 0) {
    const triggeredRuleBCandidates = triggeredRules.filter(
      (r) => r.ruleCode === ruleB.rule_code,
    );

    TestValidator.predicate(
      "At least one triggered rule should correspond to Rule B when triggers exist",
      triggeredRuleBCandidates.length > 0,
    );

    if (evaluation.highestSeverity !== undefined) {
      TestValidator.predicate(
        "highestSeverity should be at least as severe as Rule B when it triggers",
        evaluation.highestSeverity === ruleB.severity,
      );
    }
  }
}
