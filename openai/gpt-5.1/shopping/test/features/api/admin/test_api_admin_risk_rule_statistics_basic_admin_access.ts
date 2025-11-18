import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRuleStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRuleStatistics";

/**
 * Basic admin access to risk rule statistics.
 *
 * This E2E scenario verifies that a freshly joined administrator can
 * successfully call the risk rule statistics endpoint and receive a
 * structurally valid, logically consistent response.
 *
 * Business flow:
 *
 * 1. Register a new admin using POST /auth/admin/join. The backend creates a
 *    shopping_mall_admins record and issues JWT tokens encapsulated in
 *    IShoppingMallAdmin.IAuthorized. The SDK helper also wires the
 *    Authorization header onto the shared connection instance.
 * 2. Using the authenticated connection, call GET
 *    /shoppingMall/admin/statistics/riskRules to retrieve an
 *    IShoppingMallRiskRuleStatistics snapshot.
 * 3. Validate the response type with typia.assert to guarantee that all required
 *    properties (totals, buckets, rates) and nested bucket structures conform
 *    exactly to the DTO definition.
 * 4. Assert a set of safe invariants that must always hold regardless of concrete
 *    data volume:
 *
 *    - Total_rules, active_rules, disabled_rules, rules_with_recent_cases,
 *         overrides_active_count are all non-negative integers.
 *    - Active_rules and disabled_rules do not exceed total_rules.
 *    - Every rules_by_severity.count and case_counts_by_status.count is a
 *         non-negative integer.
 * 5. Call the statistics endpoint a second time to ensure structural stability:
 *    both responses are valid, and the categorical structures (severity labels,
 *    status labels) remain consistent between calls, while numeric values are
 *    allowed to differ due to concurrent activity.
 */
export async function test_api_admin_risk_rule_statistics_basic_admin_access(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain an authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. First call to risk rule statistics endpoint
  const firstStats: IShoppingMallRiskRuleStatistics =
    await api.functional.shoppingMall.admin.statistics.riskRules.index(
      connection,
    );
  typia.assert(firstStats);

  // 3. Basic non-negativity and relationship invariants on top-level fields
  TestValidator.predicate(
    "total_rules must be non-negative",
    firstStats.total_rules >= 0,
  );
  TestValidator.predicate(
    "active_rules must be non-negative",
    firstStats.active_rules >= 0,
  );
  TestValidator.predicate(
    "disabled_rules must be non-negative",
    firstStats.disabled_rules >= 0,
  );
  TestValidator.predicate(
    "rules_with_recent_cases must be non-negative",
    firstStats.rules_with_recent_cases >= 0,
  );
  TestValidator.predicate(
    "overrides_active_count must be non-negative",
    firstStats.overrides_active_count >= 0,
  );

  TestValidator.predicate(
    "active_rules cannot exceed total_rules",
    firstStats.active_rules <= firstStats.total_rules,
  );
  TestValidator.predicate(
    "disabled_rules cannot exceed total_rules",
    firstStats.disabled_rules <= firstStats.total_rules,
  );

  TestValidator.predicate(
    "sla_coverage_rate must be within [0, 1]",
    firstStats.sla_coverage_rate >= 0 && firstStats.sla_coverage_rate <= 1,
  );

  // 4. Validate bucket arrays
  for (const bucket of firstStats.rules_by_severity) {
    TestValidator.predicate(
      `rules_by_severity count must be non-negative for severity '${bucket.severity}'`,
      bucket.count >= 0,
    );
  }

  for (const bucket of firstStats.case_counts_by_status) {
    TestValidator.predicate(
      `case_counts_by_status count must be non-negative for status '${bucket.status}'`,
      bucket.count >= 0,
    );
  }

  // 5. Second call for structural stability
  const secondStats: IShoppingMallRiskRuleStatistics =
    await api.functional.shoppingMall.admin.statistics.riskRules.index(
      connection,
    );
  typia.assert(secondStats);

  // Compare sets of severity labels between first and second calls
  const firstSeverities = firstStats.rules_by_severity.map(
    (bucket) => bucket.severity,
  );
  const secondSeverities = secondStats.rules_by_severity.map(
    (bucket) => bucket.severity,
  );

  TestValidator.equals(
    "severity label set should be structurally stable across calls",
    [...firstSeverities].sort(),
    [...secondSeverities].sort(),
  );

  // Compare sets of status labels between first and second calls
  const firstStatuses = firstStats.case_counts_by_status.map(
    (bucket) => bucket.status,
  );
  const secondStatuses = secondStats.case_counts_by_status.map(
    (bucket) => bucket.status,
  );

  TestValidator.equals(
    "status label set should be structurally stable across calls",
    [...firstStatuses].sort(),
    [...secondStatuses].sort(),
  );
}
