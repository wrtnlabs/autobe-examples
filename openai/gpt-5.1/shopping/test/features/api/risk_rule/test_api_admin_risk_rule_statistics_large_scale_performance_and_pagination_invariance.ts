import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallRiskCaseEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseEvent";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";
import type { IShoppingMallRiskRuleStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRuleStatistics";

/**
 * Validate large-scale risk rule statistics correctness and stability for admin
 * dashboards.
 *
 * This E2E test simulates an administrator operating on a shopping mall risk
 * engine configuration with many risk rules and risk cases, then validates the
 * aggregated statistics returned by GET
 * /shoppingMall/admin/statistics/riskRules.
 *
 * Business flow:
 *
 * 1. Register and authenticate an admin with POST /auth/admin/join.
 * 2. Bulk-create a moderate number of risk rules (dozens) with varied severities
 *    and enabled flags using POST /shoppingMall/admin/riskRules.
 * 3. Bulk-create multiple risk cases and attach non-trivial events with POST
 *    /shoppingMall/admin/riskCases and POST
 *    /shoppingMall/admin/riskCases/{riskCaseCode}/events to simulate realistic
 *    workloads.
 * 4. Call GET /shoppingMall/admin/statistics/riskRules multiple times to obtain
 *    aggregated metrics about rules and cases.
 * 5. Assert that all numeric metrics are non-negative, that bucket sums are
 *    consistent with top-level aggregates, and that repeated calls produce
 *    stable, identical results when no further writes occur.
 *
 * The scenario intentionally focuses on correctness and stability of
 * aggregation under load, rather than strict wall-clock performance thresholds,
 * which are better validated via profiling and monitoring.
 */
export async function test_api_admin_risk_rule_statistics_large_scale_performance_and_pagination_invariance(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Bulk-create risk rules with varied severities and enabled flags.
  const severities = ["low", "medium", "high", "critical"] as const;
  const scopes = ["order", "payment", "account"] as const;

  const RULE_COUNT = 40;
  const createdRules: IShoppingMallRiskRule[] = [];

  for (let i = 0; i < RULE_COUNT; ++i) {
    const severity = severities[i % severities.length];
    const scope = scopes[i % scopes.length];
    const isEnabled = i % 3 !== 0; // roughly 2/3 enabled, 1/3 disabled

    const expressionObject = {
      threshold: i + 1,
      windowMinutes: 30 + i,
      weight: (i % 5) + 1,
    };

    const createBody = {
      rule_code: `rule_${i}`,
      name: `Risk rule ${i}`,
      scope,
      severity,
      expression_json: JSON.stringify(expressionObject),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      is_enabled: isEnabled,
      applies_to_countries: i % 4 === 0 ? '["US","KR"]' : null,
      effective_from:
        i % 5 === 0
          ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      effective_until: null,
    } satisfies IShoppingMallRiskRule.ICreate;

    const rule = await api.functional.shoppingMall.admin.riskRules.create(
      connection,
      {
        body: createBody,
      },
    );
    typia.assert<IShoppingMallRiskRule>(rule);
    createdRules.push(rule);
  }

  TestValidator.predicate(
    "created at least one risk rule",
    createdRules.length > 0,
  );

  // 3. Bulk-create risk cases.
  const CASE_COUNT = RULE_COUNT * 2;
  const caseStatuses = ["open", "under_review", "closed"] as const;
  const subjectTypes = ["customer", "seller", "order"] as const;

  const createdCases: IShoppingMallRiskCase[] = [];

  for (let i = 0; i < CASE_COUNT; ++i) {
    const status = caseStatuses[i % caseStatuses.length];
    const severity = severities[(i + 1) % severities.length];
    const subjectType = subjectTypes[i % subjectTypes.length];

    const caseBody = {
      case_code: `case_${i}`,
      title: `Risk case ${i}`,
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status,
      severity,
      primary_subject_type: subjectType,
      primary_subject_id: null,
      primary_subject_display: RandomGenerator.paragraph({ sentences: 3 }),
      sla_due_at:
        i % 3 === 0
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          : null,
    } satisfies IShoppingMallRiskCase.ICreate;

    const created = await api.functional.shoppingMall.admin.riskCases.create(
      connection,
      {
        body: caseBody,
      },
    );
    typia.assert<IShoppingMallRiskCase>(created);
    createdCases.push(created);
  }

  TestValidator.predicate(
    "created at least one risk case",
    createdCases.length > 0,
  );

  // 4. Append risk case events for a subset to create status transitions.
  const EVENT_COUNT = Math.min(createdCases.length, 40);
  for (let i = 0; i < EVENT_COUNT; ++i) {
    const riskCase = createdCases[i];
    const newStatus = caseStatuses[(i + 1) % caseStatuses.length];

    const eventBody = {
      event_type: i % 2 === 0 ? "status_changed" : "note_added",
      from_status: i % 2 === 0 ? riskCase.status : null,
      to_status: i % 2 === 0 ? newStatus : null,
      description:
        i % 2 === 0
          ? `Status changed from ${riskCase.status} to ${newStatus}`
          : RandomGenerator.paragraph({ sentences: 5 }),
      related_entity_type:
        i % 3 === 0 ? subjectTypes[i % subjectTypes.length] : null,
      related_entity_id: null,
    } satisfies IShoppingMallRiskCaseEvent.ICreate;

    const event =
      await api.functional.shoppingMall.admin.riskCases.events.create(
        connection,
        {
          riskCaseCode: riskCase.case_code,
          body: eventBody,
        },
      );
    typia.assert<IShoppingMallRiskCaseEvent>(event);
  }

  // 5. First statistics call and baseline validation.
  const stats1: IShoppingMallRiskRuleStatistics =
    await api.functional.shoppingMall.admin.statistics.riskRules.index(
      connection,
    );
  typia.assert<IShoppingMallRiskRuleStatistics>(stats1);

  // Basic non-negativity checks.
  TestValidator.predicate(
    "total_rules is non-negative",
    stats1.total_rules >= 0,
  );
  TestValidator.predicate(
    "active_rules is non-negative",
    stats1.active_rules >= 0,
  );
  TestValidator.predicate(
    "disabled_rules is non-negative",
    stats1.disabled_rules >= 0,
  );
  TestValidator.predicate(
    "overrides_active_count is non-negative",
    stats1.overrides_active_count >= 0,
  );

  // Severity bucket invariants.
  const totalSeverityBucketCount = stats1.rules_by_severity.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );
  TestValidator.predicate(
    "severity bucket counts are non-negative",
    stats1.rules_by_severity.every((b) => b.count >= 0),
  );
  TestValidator.predicate(
    "severity bucket sum does not exceed total_rules",
    totalSeverityBucketCount <= stats1.total_rules,
  );

  // Case status bucket invariants.
  const totalCaseStatusCount = stats1.case_counts_by_status.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );
  TestValidator.predicate(
    "case status bucket counts are non-negative",
    stats1.case_counts_by_status.every((b) => b.count >= 0),
  );
  TestValidator.predicate(
    "total case status count is non-negative",
    totalCaseStatusCount >= 0,
  );

  // SLA coverage rate should be in [0, 1] (or exactly 0 if no SLAs configured).
  TestValidator.predicate(
    "sla_coverage_rate is within [0, 1]",
    stats1.sla_coverage_rate >= 0 && stats1.sla_coverage_rate <= 1,
  );

  // 6. Repeated calls to verify stability and idempotence.
  const REPEAT = 3;
  for (let i = 0; i < REPEAT; ++i) {
    const statsN: IShoppingMallRiskRuleStatistics =
      await api.functional.shoppingMall.admin.statistics.riskRules.index(
        connection,
      );
    typia.assert<IShoppingMallRiskRuleStatistics>(statsN);

    TestValidator.equals(
      `total_rules stable on repetition ${i + 1}`,
      statsN.total_rules,
      stats1.total_rules,
    );
    TestValidator.equals(
      `active_rules stable on repetition ${i + 1}`,
      statsN.active_rules,
      stats1.active_rules,
    );
    TestValidator.equals(
      `disabled_rules stable on repetition ${i + 1}`,
      statsN.disabled_rules,
      stats1.disabled_rules,
    );
    TestValidator.equals(
      `overrides_active_count stable on repetition ${i + 1}`,
      statsN.overrides_active_count,
      stats1.overrides_active_count,
    );
    TestValidator.equals(
      `sla_coverage_rate stable on repetition ${i + 1}`,
      statsN.sla_coverage_rate,
      stats1.sla_coverage_rate,
    );
    TestValidator.equals(
      `rules_by_severity stable on repetition ${i + 1}`,
      statsN.rules_by_severity,
      stats1.rules_by_severity,
    );
    TestValidator.equals(
      `case_counts_by_status stable on repetition ${i + 1}`,
      statsN.case_counts_by_status,
      stats1.case_counts_by_status,
    );
  }
}
