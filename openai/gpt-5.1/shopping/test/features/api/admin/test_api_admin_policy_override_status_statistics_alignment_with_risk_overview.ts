import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorAnomalyStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorAnomalyStatsSummary";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRiskOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRiskOverview";
import type { IShoppingMallCampaignRiskStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignRiskStatsSummary";
import type { IShoppingMallPolicyOverrideStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverrideStatusStatistics";
import type { IShoppingMallRefundAndDisputeRiskStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeRiskStatsSummary";
import type { IShoppingMallRiskCaseStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseStatsSummary";
import type { IShoppingMallRiskRuleStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRuleStatsSummary";

/**
 * Validate alignment between policy override status statistics and the admin
 * risk overview dashboard for an authenticated admin.
 *
 * Business goals:
 *
 * - Ensure an admin can join, then read aggregate policy override statistics and
 *   the high-level risk overview.
 * - Verify that the statistics endpoint and the risk overview’s riskRuleStats
 *   segment are logically consistent with each other.
 * - Confirm that both endpoints are read-only aggregates that do not expose
 *   individual override identifiers or subject‑level data.
 * - Enforce that both endpoints require admin authentication.
 *
 * Step-by-step flow:
 *
 * 1. Register an admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate and rely on the SDK to attach the access
 *    token to the shared connection.
 * 2. Call GET /shoppingMall/admin/statistics/policyOverridesByStatus to retrieve
 *    IShoppingMallPolicyOverrideStatusStatistics and validate:
 *
 *    - Response type via typia.assert.
 *    - TotalCount equals the sum of row.count across all items.
 * 3. Call GET /shoppingMall/admin/adminDashboard/riskOverview to retrieve
 *    IShoppingMallAdminRiskOverview and validate its type, then extract
 *    riskRuleStats.
 * 4. Check cross-endpoint consistency:
 *
 *    - If stats.totalCount === 0, require riskRuleStats.policyOverrideCount === 0.
 *    - Otherwise require riskRuleStats.policyOverrideCount >= stats.totalCount.
 * 5. For each row in stats.items, sanity-check that count is non‑negative and
 *    ratio (when present) lies within [0, 1]. Rely on typia.assert for full
 *    structural guarantees so that no identifier or subject fields are exposed
 *    beyond the DTO surface.
 * 6. Re-call both GET endpoints and re-validate the aggregation invariant to
 *    confirm they are read-only from the test’s perspective and type-stable
 *    across calls.
 * 7. Construct an unauthenticated connection (headers cleared) and confirm that
 *    both endpoints reject such requests using TestValidator.error, without
 *    inspecting HTTP status codes directly.
 */
export async function test_api_admin_policy_override_status_statistics_alignment_with_risk_overview(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context via SDK
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. Call policy override status statistics as authenticated admin
  const stats: IShoppingMallPolicyOverrideStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.policyOverridesByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallPolicyOverrideStatusStatistics>(stats);

  // Ensure aggregation invariants: totalCount equals sum of row counts
  const sumOfRowCounts = stats.items.reduce((acc, row) => acc + row.count, 0);
  TestValidator.equals(
    "policy override stats totalCount equals sum of row counts",
    sumOfRowCounts,
    stats.totalCount,
  );

  // 3. Call admin risk overview dashboard as authenticated admin
  const overview: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminRiskOverview>(overview);

  const riskRuleStats: IShoppingMallRiskRuleStatsSummary =
    overview.riskRuleStats;
  typia.assert<IShoppingMallRiskRuleStatsSummary>(riskRuleStats);

  // 4. Cross-endpoint consistency between policy override stats and risk overview
  if (stats.totalCount === 0) {
    TestValidator.equals(
      "when stats.totalCount is zero, riskRuleStats.policyOverrideCount should also be zero",
      riskRuleStats.policyOverrideCount,
      0,
    );
  } else {
    TestValidator.predicate(
      "riskRuleStats.policyOverrideCount is greater than or equal to stats.totalCount",
      riskRuleStats.policyOverrideCount >= stats.totalCount,
    );
  }

  // 5. Validate that stats rows have only aggregate-safe fields by type
  for (const row of stats.items) {
    TestValidator.predicate(
      "policy override stats row count is non-negative",
      row.count >= 0,
    );
    if (row.ratio !== undefined) {
      TestValidator.predicate(
        "policy override stats row ratio is between 0 and 1",
        row.ratio >= 0 && row.ratio <= 1,
      );
    }
  }

  // 6. Idempotency/read-only behavior check via re-calls
  const statsAgain: IShoppingMallPolicyOverrideStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.policyOverridesByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallPolicyOverrideStatusStatistics>(statsAgain);

  const overviewAgain: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminRiskOverview>(overviewAgain);

  const sumOfRowCountsAgain = statsAgain.items.reduce(
    (acc, row) => acc + row.count,
    0,
  );
  TestValidator.equals(
    "policy override stats totalCount equals sum of row counts on second call",
    sumOfRowCountsAgain,
    statsAgain.totalCount,
  );

  // 7. Authentication enforcement: unauthenticated connection should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "policy override status statistics requires admin authentication",
    async () => {
      await api.functional.shoppingMall.admin.statistics.policyOverridesByStatus.index(
        unauthenticatedConnection,
      );
    },
  );

  await TestValidator.error(
    "admin risk overview requires admin authentication",
    async () => {
      await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
        unauthenticatedConnection,
      );
    },
  );
}
