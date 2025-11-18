import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldOverview";
import type { IShoppingMallLegalHoldStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldStatusStatistics";

/**
 * Validate consistency and authorization behavior between legal hold status
 * statistics and the admin legal hold overview dashboard.
 *
 * Business goals:
 *
 * - Ensure an authenticated admin can retrieve both per-status legal hold
 *   statistics and the high-level legal hold overview.
 * - Verify that the aggregated shapes are self-consistent (sums of child metrics
 *   match the documented total fields).
 * - Confirm that both endpoints are admin-only and reject unauthenticated access.
 * - Rely on DTO contracts to guarantee that only aggregate data is exposed and no
 *   individual legal hold identifiers or subject details are leaked.
 *
 * Scenario steps:
 *
 * 1. Register a new admin using POST /auth/admin/join to obtain an authenticated
 *    connection.
 * 2. Call GET /shoppingMall/admin/statistics/legalHoldsByStatus to get aggregate
 *    counts of legal holds grouped by status and validate internal consistency
 *    of the response.
 * 3. Call GET /shoppingMall/admin/adminDashboard/legalHoldOverview to get
 *    dashboard metrics and validate internal consistency of the overview.
 * 4. Cross-check that each endpoint’s own internal totals are coherent, without
 *    asserting a specific relationship between the two endpoints’ totals
 *    because we do not control underlying legal hold records in this test.
 * 5. Clone the connection into an unauthenticated variant (empty headers) and
 *    verify that both endpoints reject access in that context.
 */
export async function test_api_admin_legal_hold_status_statistics_consistency_with_overview_dashboard(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain an authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Fetch legal hold statistics grouped by status for this admin
  const statusStats: IShoppingMallLegalHoldStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.legalHoldsByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallLegalHoldStatusStatistics>(statusStats);

  const totalByRows = statusStats.items.reduce(
    (sum, row) => sum + row.count,
    0,
  );

  TestValidator.equals(
    "legal hold status statistics: sum of row counts must equal totalCount",
    totalByRows,
    statusStats.totalCount,
  );

  // 3. Fetch legal hold overview dashboard for the same admin
  const overview: IShoppingMallLegalHoldOverview =
    await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
      connection,
    );
  typia.assert<IShoppingMallLegalHoldOverview>(overview);

  const totalBySubjectTypes =
    overview.activeHoldsBySubjectType.customer +
    overview.activeHoldsBySubjectType.seller +
    overview.activeHoldsBySubjectType.order +
    overview.activeHoldsBySubjectType.dispute +
    overview.activeHoldsBySubjectType.riskCase;

  TestValidator.equals(
    "legal hold overview: sum of subject-type buckets must equal totalActiveHolds",
    totalBySubjectTypes,
    overview.totalActiveHolds,
  );

  // 4. Perform additional sanity checks on overview structures
  for (const bucket of overview.agingBuckets) {
    TestValidator.predicate(
      "aging bucket count must be non-negative",
      bucket.count >= 0,
    );

    TestValidator.predicate(
      "aging bucket minDays must be non-negative",
      bucket.minDays >= 0,
    );

    if (bucket.maxDays !== undefined) {
      TestValidator.predicate(
        "aging bucket maxDays must be >= minDays when present",
        bucket.maxDays >= bucket.minDays,
      );
    }
  }

  TestValidator.predicate(
    "recent activity windowDays must be positive",
    overview.recentActivity.windowDays > 0,
  );

  TestValidator.predicate(
    "recent activity createdCount must be non-negative",
    overview.recentActivity.createdCount >= 0,
  );

  TestValidator.predicate(
    "recent activity releasedCount must be non-negative",
    overview.recentActivity.releasedCount >= 0,
  );

  for (const point of overview.trend.points) {
    TestValidator.predicate(
      "trend point activeCount must be non-negative",
      point.activeCount >= 0,
    );
  }

  // 5. Negative authentication tests: unauthenticated connection should not access admin endpoints
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to legalHoldsByStatus statistics must fail",
    async () => {
      await api.functional.shoppingMall.admin.statistics.legalHoldsByStatus.index(
        unauthenticatedConnection,
      );
    },
  );

  await TestValidator.error(
    "unauthenticated access to legalHoldOverview must fail",
    async () => {
      await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
        unauthenticatedConnection,
      );
    },
  );
}
