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

export async function test_api_admin_risk_rule_statistics_reflects_rule_and_case_activity(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authorized context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create several risk rules with varying severities and enabled flags.
  const severities = ["low", "medium", "high"] as const;

  const createdRules: IShoppingMallRiskRule[] = [];

  for (const severity of severities) {
    const enabledRuleBody = {
      rule_code: `${severity}_rule_enabled_${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      scope: RandomGenerator.pick(["order", "payment", "account"] as const),
      severity,
      expression_json: JSON.stringify({ threshold: 10, windowMinutes: 60 }),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_enabled: true,
      applies_to_countries: null,
      effective_from: null,
      effective_until: null,
    } satisfies IShoppingMallRiskRule.ICreate;

    const enabledRule =
      await api.functional.shoppingMall.admin.riskRules.create(connection, {
        body: enabledRuleBody,
      });
    typia.assert<IShoppingMallRiskRule>(enabledRule);
    createdRules.push(enabledRule);

    const disabledRuleBody = {
      rule_code: `${severity}_rule_disabled_${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      scope: RandomGenerator.pick(["order", "payment", "account"] as const),
      severity,
      expression_json: JSON.stringify({ threshold: 5, windowMinutes: 30 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      is_enabled: false,
      applies_to_countries: null,
      effective_from: null,
      effective_until: null,
    } satisfies IShoppingMallRiskRule.ICreate;

    const disabledRule =
      await api.functional.shoppingMall.admin.riskRules.create(connection, {
        body: disabledRuleBody,
      });
    typia.assert<IShoppingMallRiskRule>(disabledRule);
    createdRules.push(disabledRule);
  }

  const createdEnabledCount = createdRules.filter((r) => r.is_enabled).length;
  const createdDisabledCount = createdRules.filter((r) => !r.is_enabled).length;

  // 3. Create several risk cases conceptually tied to some rules via severity.
  const createdCases: IShoppingMallRiskCase[] = [];

  const caseStatuses = ["open", "under_review"] as const;

  for (const severity of severities) {
    const status = RandomGenerator.pick(caseStatuses);

    const caseBody = {
      case_code: `CASE_${RandomGenerator.alphaNumeric(12)}`,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      status,
      severity,
      primary_subject_type: RandomGenerator.pick([
        "customer",
        "seller",
        "order",
        "payment",
      ] as const),
      primary_subject_id: null,
      primary_subject_display: null,
      sla_due_at: null,
    } satisfies IShoppingMallRiskCase.ICreate;

    const riskCase = await api.functional.shoppingMall.admin.riskCases.create(
      connection,
      {
        body: caseBody,
      },
    );
    typia.assert<IShoppingMallRiskCase>(riskCase);
    createdCases.push(riskCase);
  }

  // 4. For one case, append an event that represents a status change.
  const targetCase = createdCases[0];

  const eventBody = {
    event_type: "status_changed",
    from_status: targetCase.status,
    to_status: "closed",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    related_entity_type: null,
    related_entity_id: null,
  } satisfies IShoppingMallRiskCaseEvent.ICreate;

  const event: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: targetCase.case_code,
        body: eventBody,
      },
    );
  typia.assert<IShoppingMallRiskCaseEvent>(event);

  // 5. Fetch risk rule statistics.
  const stats: IShoppingMallRiskRuleStatistics =
    await api.functional.shoppingMall.admin.statistics.riskRules.index(
      connection,
    );
  typia.assert<IShoppingMallRiskRuleStatistics>(stats);

  // 6. Assert rule-level aggregates using lower-bound semantics.
  TestValidator.predicate(
    "total_rules should be at least the number of rules created in this test",
    stats.total_rules >= createdRules.length,
  );

  TestValidator.predicate(
    "active_rules should be at least number of created enabled rules",
    stats.active_rules >= createdEnabledCount,
  );

  TestValidator.predicate(
    "disabled_rules should be at least number of created disabled rules",
    stats.disabled_rules >= createdDisabledCount,
  );

  TestValidator.predicate(
    "active_rules + disabled_rules should be at least total_rules",
    stats.active_rules + stats.disabled_rules >= stats.total_rules,
  );

  // Verify rules_by_severity coverage for each severity we used.
  for (const severity of severities) {
    const bucket = stats.rules_by_severity.find((b) => b.severity === severity);

    const createdWithSeverity = createdRules.filter(
      (r) => r.severity === severity,
    ).length;

    TestValidator.predicate(
      `rules_by_severity should contain bucket for severity ${severity}`,
      bucket !== undefined,
    );

    if (bucket !== undefined) {
      TestValidator.predicate(
        `rules_by_severity bucket for ${severity} should have count >= created rules`,
        bucket.count >= createdWithSeverity,
      );
    }
  }

  // 7. Assert case-related statistics with tolerant expectations.
  const statusBuckets = stats.case_counts_by_status;

  // Ensure that each status we used in created cases appears and has count >= created cases.
  const statusesUsed = new Set<string>();
  for (const c of createdCases) statusesUsed.add(c.status);
  // Also include the closed status we used in the event.
  statusesUsed.add("closed");

  for (const status of statusesUsed) {
    const bucket = statusBuckets.find((b) => b.status === status);
    const createdWithStatus =
      createdCases.filter((c) => c.status === status).length +
      (status === "closed" ? 0 : 0);

    TestValidator.predicate(
      `case_counts_by_status should contain bucket for status ${status}`,
      bucket !== undefined,
    );

    if (bucket !== undefined) {
      TestValidator.predicate(
        `case_counts_by_status bucket for ${status} should have count >= created cases with that status`,
        bucket.count >= createdWithStatus,
      );
    }
  }

  // 8. Assert SLA coverage rate and overrides count sanity.
  TestValidator.predicate(
    "sla_coverage_rate should be between 0 and 1 inclusive",
    stats.sla_coverage_rate >= 0 && stats.sla_coverage_rate <= 1,
  );

  TestValidator.predicate(
    "overrides_active_count should be non-negative",
    stats.overrides_active_count >= 0,
  );
}
