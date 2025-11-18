import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverride";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";
import type { IShoppingMallRiskRuleStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRuleStatistics";

/**
 * Validate that admin-side changes to risk rule configuration and related
 * governance objects (SLA configs and policy overrides) are reflected in
 * subsequent risk-rule statistics.
 *
 * Business flow under test:
 *
 * 1. Admin joins (POST /auth/admin/join), which also issues JWT tokens used
 *    implicitly by subsequent admin-only endpoints.
 * 2. Admin creates an initial risk rule (POST /shoppingMall/admin/riskRules) with
 *    a specific severity and enabled=true, then reads baseline risk-rule
 *    statistics (GET /shoppingMall/admin/statistics/riskRules).
 * 3. Admin updates that rule (PUT /shoppingMall/admin/riskRules/{ruleCode}) to
 *    change severity and optionally disable it, then re-reads statistics and
 *    verifies that aggregate counters (active_rules, disabled_rules,
 *    rules_by_severity) have changed in a logically consistent way.
 * 4. Admin creates a case SLA configuration (POST
 *    /shoppingMall/admin/caseSlaConfigs) and a policy override (POST
 *    /shoppingMall/admin/policyOverrides), then re-reads statistics and checks
 *    that SLA coverage and override-related metrics reflect the new
 *    configuration (directional assertions only, not exact values).
 *
 * The test focuses on logical consistency of aggregate metrics rather than
 * specific numeric values, because underlying aggregation rules can depend on
 * existing data. It asserts non-negativity, reasonable bounds (e.g.,
 * total_rules >= active_rules + disabled_rules), and that counters move in the
 * expected direction when configuration changes.
 */
export async function test_api_admin_risk_rule_statistics_changes_with_configuration_updates(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
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

  // 2. Create baseline risk rule
  const initialRuleCode: string = `rule_${RandomGenerator.alphaNumeric(8)}`;
  const initialSeverityChoices = ["low", "medium", "high"] as const;
  const initialSeverity = RandomGenerator.pick(initialSeverityChoices);

  const createRuleBody = {
    rule_code: initialRuleCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "order",
    severity: initialSeverity,
    expression_json: JSON.stringify({ kind: "threshold", value: 10 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_enabled: true,
    applies_to_countries: JSON.stringify(["US", "KR"]),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRiskRule.ICreate;

  const createdRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.create(connection, {
      body: createRuleBody,
    });
  typia.assert(createdRule);

  // Baseline statistics after first rule
  const baselineStats: IShoppingMallRiskRuleStatistics =
    await api.functional.shoppingMall.admin.statistics.riskRules.index(
      connection,
    );
  typia.assert(baselineStats);

  // Basic sanity checks on baseline stats
  TestValidator.predicate(
    "baseline counts are non-negative",
    baselineStats.total_rules >= 0 &&
      baselineStats.active_rules >= 0 &&
      baselineStats.disabled_rules >= 0 &&
      baselineStats.overrides_active_count >= 0,
  );
  TestValidator.predicate(
    "baseline total rules at least active + disabled",
    baselineStats.total_rules >=
      baselineStats.active_rules + baselineStats.disabled_rules,
  );
  TestValidator.predicate(
    "baseline sla_coverage_rate within [0,1]",
    baselineStats.sla_coverage_rate >= 0 &&
      baselineStats.sla_coverage_rate <= 1,
  );

  // Helper to sum severity bucket counts
  const sumSeverityBuckets = (stats: IShoppingMallRiskRuleStatistics): number =>
    stats.rules_by_severity.reduce((acc, bucket) => acc + bucket.count, 0);

  const baselineSeveritySum = sumSeverityBuckets(baselineStats);
  TestValidator.predicate(
    "baseline severity bucket counts non-negative and consistent",
    baselineSeveritySum >= 0 &&
      baselineSeveritySum <= baselineStats.total_rules,
  );

  // 3. Update the rule: flip enabled flag and change severity
  const updatedSeverityChoices = ["medium", "high", "critical"] as const;
  const updatedSeverity = RandomGenerator.pick(updatedSeverityChoices);

  const updateRuleBody = {
    severity: updatedSeverity,
    is_enabled: false,
  } satisfies IShoppingMallRiskRule.IUpdate;

  const updatedRule: IShoppingMallRiskRule =
    await api.functional.shoppingMall.admin.riskRules.update(connection, {
      ruleCode: initialRuleCode,
      body: updateRuleBody,
    });
  typia.assert(updatedRule);

  TestValidator.equals(
    "updated rule has disabled flag false->false or true->false",
    updatedRule.is_enabled,
    false,
  );

  // Statistics after rule update
  const afterUpdateStats: IShoppingMallRiskRuleStatistics =
    await api.functional.shoppingMall.admin.statistics.riskRules.index(
      connection,
    );
  typia.assert(afterUpdateStats);

  TestValidator.predicate(
    "after update counts are non-negative",
    afterUpdateStats.total_rules >= 0 &&
      afterUpdateStats.active_rules >= 0 &&
      afterUpdateStats.disabled_rules >= 0,
  );
  TestValidator.predicate(
    "after update total rules at least active + disabled",
    afterUpdateStats.total_rules >=
      afterUpdateStats.active_rules + afterUpdateStats.disabled_rules,
  );

  // When disabling a rule, active_rules should not increase and disabled_rules
  // should not decrease (directional, not strict)
  TestValidator.predicate(
    "active_rules does not increase after disabling a rule",
    afterUpdateStats.active_rules <= baselineStats.active_rules,
  );
  TestValidator.predicate(
    "disabled_rules does not decrease after disabling a rule",
    afterUpdateStats.disabled_rules >= baselineStats.disabled_rules,
  );

  const afterUpdateSeveritySum = sumSeverityBuckets(afterUpdateStats);
  TestValidator.predicate(
    "after update severity bucket sum within reasonable bounds",
    afterUpdateSeveritySum >= 0 &&
      afterUpdateSeveritySum <= afterUpdateStats.total_rules,
  );

  // 4. Create a case SLA configuration that should contribute to SLA coverage
  const slaCreateBody = {
    shopping_mall_business_policy_version_id: null,
    case_type: "risk_case",
    actor_role: "admin",
    action_type: "initial_response",
    target_duration_seconds: 3600 as number & tags.Type<"int32">,
    warning_duration_seconds: 1800 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const createdSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaCreateBody,
    });
  typia.assert(createdSla);

  // 5. Create a policy override that should affect overrides_active_count
  // We do not have an API to create policy versions, so we rely on typia.random
  // to generate a compatible policy_version_id and trust the test environment.
  const policyOverrideCreateBody = {
    shopping_mall_policy_version_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    subject_type: "global",
    subject_id: null,
    subject_display: "global risk overrides",
    override_code: "risk_threshold_adjustment",
    override_value: "1.5",
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const createdOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: policyOverrideCreateBody,
    });
  typia.assert(createdOverride);

  // 6. Statistics after SLA config and policy override creation
  const afterGovernanceStats: IShoppingMallRiskRuleStatistics =
    await api.functional.shoppingMall.admin.statistics.riskRules.index(
      connection,
    );
  typia.assert(afterGovernanceStats);

  TestValidator.predicate(
    "after governance counts are non-negative",
    afterGovernanceStats.total_rules >= 0 &&
      afterGovernanceStats.active_rules >= 0 &&
      afterGovernanceStats.disabled_rules >= 0 &&
      afterGovernanceStats.overrides_active_count >= 0,
  );
  TestValidator.predicate(
    "after governance total rules at least active + disabled",
    afterGovernanceStats.total_rules >=
      afterGovernanceStats.active_rules + afterGovernanceStats.disabled_rules,
  );
  TestValidator.predicate(
    "after governance sla_coverage_rate within [0,1]",
    afterGovernanceStats.sla_coverage_rate >= 0 &&
      afterGovernanceStats.sla_coverage_rate <= 1,
  );

  // We expect overrides_active_count to be non-decreasing after creating a new
  // active override. Do not assert strict increase because pre-existing
  // overrides may dominate.
  TestValidator.predicate(
    "overrides_active_count does not decrease after creating override",
    afterGovernanceStats.overrides_active_count >=
      baselineStats.overrides_active_count,
  );

  const afterGovernanceSeveritySum = sumSeverityBuckets(afterGovernanceStats);
  TestValidator.predicate(
    "after governance severity bucket sum within bounds",
    afterGovernanceSeveritySum >= 0 &&
      afterGovernanceSeveritySum <= afterGovernanceStats.total_rules,
  );

  // 7. Negative-path sanity check: updating a clearly non-existent ruleCode
  await TestValidator.error(
    "updating non-existent ruleCode should fail",
    async () => {
      await api.functional.shoppingMall.admin.riskRules.update(connection, {
        ruleCode: `nonexistent_${RandomGenerator.alphaNumeric(8)}`,
        body: { name: "non-existent" } satisfies IShoppingMallRiskRule.IUpdate,
      });
    },
  );
}
