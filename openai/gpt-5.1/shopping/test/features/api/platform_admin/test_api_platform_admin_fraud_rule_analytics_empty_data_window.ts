import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleAnalytics";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate fraud rule analytics behavior for an empty violation window.
 *
 * Business context: Platform administrators use
 * `/shoppingMall/platformAdmin/analytics/fraudRules` to power dashboards and
 * reports about fraud rule performance. Dashboards frequently include recent or
 * future windows where there may be no rule violations at all. In such
 * "no-traffic" windows the analytics endpoint must still respond successfully
 * with consistent zero-valued aggregates and safely renderable breakdown
 * structures.
 *
 * This test ensures that when the requested analysis window contains no fraud
 * rule violations, the endpoint:
 *
 * - Returns a valid `IShoppingMallFraudRuleAnalytics.IResponse` object,
 * - Reports zero global counts, and
 * - Does not leak any positive violation counts in per-rule, time-series,
 *   severity, or category breakdowns.
 *
 * High level steps:
 *
 * 1. Join as a platform admin (POST /auth/platformAdmin/join) to obtain an
 *    authorized admin session; the SDK will set Authorization headers
 *    automatically.
 * 2. As this admin, create at least one fraud rule definition using POST
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions so that the analytics
 *    request can filter by a concrete ruleId.
 * 3. Construct an analytics request body with an analysis window in the future,
 *    using `timeGranularity: "day"`, and filters that include the created rule
 *    id. Also request all breakdowns:
 *
 *    - IncludePerRuleBreakdown: true
 *    - IncludeTimeSeries: true
 *    - IncludeSeverityBreakdown: true
 *    - IncludeRuleCategoryBreakdown: true
 * 4. Call PATCH /shoppingMall/platformAdmin/analytics/fraudRules with this request
 *    body.
 * 5. Assert that:
 *
 *    - The response structurally matches IShoppingMallFraudRuleAnalytics.IResponse.
 *    - `totalViolations === 0`.
 *    - `uniqueRulesTriggered === 0`.
 *    - If `perRuleMetrics` is defined, every metric has `totalViolations === 0`.
 *    - If `timeSeries` is defined, every point has `totalViolations === 0` and (if
 *         present) `uniqueRulesTriggered === 0`.
 *    - If `severityBreakdown` is defined, every bucket has `totalViolations === 0`.
 *    - If `ruleCategoryBreakdown` is defined, every bucket has `totalViolations ===
 *         0`.
 *
 * The test does not attempt to validate exact time-bucket ranges or HTTP status
 * codes; instead it focuses on the zero-violation semantics in the absence of
 * underlying fraud events.
 */
export async function test_api_platform_admin_fraud_rule_analytics_empty_data_window(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile(), // just treat as arbitrary string; not validated as IP
    href: "https://admin.example.com/join", // must be uri format
    referrer: "https://admin.example.com/landing", // must be uri format
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least one fraud rule definition
  const createRuleBody = {
    ruleCode: `TEST_RULE_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: "payment", // arbitrary scope string
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    ruleExpression: JSON.stringify({
      type: "velocity",
      maxAttempts: 3,
      windowMinutes: 10,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const rule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: createRuleBody },
    );
  typia.assert(rule);

  // 3. Build a future time window where we assume there will be no violations
  const now = new Date();
  const fromDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
  const toDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +2 days

  const analyticsRequest = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    timeGranularity: "day" as const,
    ruleIds: [rule.id],
    // Use rule.category if present; otherwise omit ruleCategories filter
    ruleCategories: rule.category !== undefined ? [rule.category] : undefined,
    severities: [rule.severity],
    eventTypes: [rule.scope],
    includePerRuleBreakdown: true,
    includeTimeSeries: true,
    includeSeverityBreakdown: true,
    includeRuleCategoryBreakdown: true,
  } satisfies IShoppingMallFraudRuleAnalytics.IRequest;

  // 4. Call fraud rule analytics endpoint
  const analytics: IShoppingMallFraudRuleAnalytics.IResponse =
    await api.functional.shoppingMall.platformAdmin.analytics.fraudRules.index(
      connection,
      { body: analyticsRequest },
    );
  typia.assert(analytics);

  // 5. Global invariants: echo of window & zero counts
  TestValidator.equals(
    "analytics from echoes request from",
    analytics.from,
    analyticsRequest.from,
  );
  TestValidator.equals(
    "analytics to echoes request to",
    analytics.to,
    analyticsRequest.to,
  );
  TestValidator.equals(
    "analytics timeGranularity echoes request timeGranularity",
    analytics.timeGranularity,
    analyticsRequest.timeGranularity,
  );
  TestValidator.equals(
    "totalViolations must be zero in empty window",
    analytics.totalViolations,
    0,
  );
  TestValidator.equals(
    "uniqueRulesTriggered must be zero in empty window",
    analytics.uniqueRulesTriggered,
    0,
  );

  // 6. Per-rule metrics: if present, all totals must be zero
  if (analytics.perRuleMetrics !== undefined) {
    for (const metric of analytics.perRuleMetrics) {
      TestValidator.equals(
        "perRuleMetrics.totalViolations must be zero in empty window",
        metric.totalViolations,
        0,
      );
      if (metric.uniqueEntitiesAffected !== undefined) {
        TestValidator.predicate(
          "perRuleMetrics.uniqueEntitiesAffected must not be negative",
          metric.uniqueEntitiesAffected >= 0,
        );
      }
      if (metric.hitRatePerThousand !== undefined) {
        TestValidator.predicate(
          "perRuleMetrics.hitRatePerThousand must not be negative",
          metric.hitRatePerThousand >= 0,
        );
      }
      if (metric.falsePositiveRate !== undefined) {
        TestValidator.predicate(
          "perRuleMetrics.falsePositiveRate must be between 0 and 1",
          metric.falsePositiveRate >= 0 && metric.falsePositiveRate <= 1,
        );
      }
    }
  }

  // 7. Time-series metrics: if present, all totals must be zero
  if (analytics.timeSeries !== undefined) {
    for (const point of analytics.timeSeries) {
      TestValidator.equals(
        "timeSeries.totalViolations must be zero in empty window",
        point.totalViolations,
        0,
      );
      if (point.uniqueRulesTriggered !== undefined) {
        TestValidator.equals(
          "timeSeries.uniqueRulesTriggered must be zero in empty window",
          point.uniqueRulesTriggered,
          0,
        );
      }
    }
  }

  // 8. Severity breakdown: if present, all totals must be zero
  if (analytics.severityBreakdown !== undefined) {
    for (const bucket of analytics.severityBreakdown) {
      TestValidator.equals(
        "severityBreakdown.totalViolations must be zero in empty window",
        bucket.totalViolations,
        0,
      );
    }
  }

  // 9. Rule category breakdown: if present, all totals must be zero
  if (analytics.ruleCategoryBreakdown !== undefined) {
    for (const bucket of analytics.ruleCategoryBreakdown) {
      TestValidator.equals(
        "ruleCategoryBreakdown.totalViolations must be zero in empty window",
        bucket.totalViolations,
        0,
      );
    }
  }
}
