import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallRiskCaseStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseStatusStatistics";

/**
 * Verify that risk-case-by-status statistics reflect lifecycle status
 * transitions.
 *
 * Business goal: Ensure that GET
 * /shoppingMall/admin/statistics/riskCasesByStatus returns aggregations that
 * change consistently when existing risk cases transition between statuses
 * (e.g., from "open" to "closed"). The test uses only officially exposed admin
 * APIs and DTOs, and it must be robust even in the presence of pre-existing
 * data.
 *
 * High-level steps:
 *
 * 1. Register an admin via POST /auth/admin/join, which also authenticates the
 *    connection for subsequent admin-only endpoints.
 * 2. Create N new risk cases with status "open" via POST
 *    /shoppingMall/admin/riskCases.
 * 3. Fetch initial statistics via GET
 *    /shoppingMall/admin/statistics/riskCasesByStatus and capture:
 *
 *    - TotalCases_before
 *    - Open_count_before for bucket.status === "open" (defaulting to 0 if no such
 *         bucket exists).
 * 4. Update M (1 <= M <= N) of those created risk cases using PUT
 *    /shoppingMall/admin/riskCases/{riskCaseCode} to change their status to a
 *    terminal or non-open status (e.g., "closed").
 * 5. Fetch statistics again and capture:
 *
 *    - TotalCases_after
 *    - Open_count_after for the "open" bucket (again defaulting to 0 if missing)
 *    - Closed_count_after for the "closed" bucket (defaulting to 0 if missing)
 * 6. Assert the following business invariants:
 *
 *    - TotalCases_after === totalCases_before (only status changed, no creation or
 *         deletion).
 *    - Open_count_after === open_count_before - M (as long as the bucket is present;
 *         if open bucket disappears when count reaches 0, treat its count as 0
 *         for comparison).
 *    - Closed_count_after >= closed_count_before + M (if closed bucket was present
 *         before) or closed_count_after >= M when there was no closed bucket
 *         initially.
 *    - For both snapshots, sum of bucket.count equals totalCases to ensure internal
 *         consistency of the statistics DTO.
 */
export async function test_api_admin_statistics_risk_cases_by_status_effect_of_case_lifecycle_changes(
  connection: api.IConnection,
) {
  // 1. Register an admin and authenticate connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/entry",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create multiple open risk cases
  const CASE_COUNT = 3;
  const createdCases: IShoppingMallRiskCase[] = [];

  for (let i = 0; i < CASE_COUNT; i++) {
    const createBody = {
      case_code: `E2E-OPEN-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: "open",
      severity: RandomGenerator.pick([
        "low",
        "medium",
        "high",
        "critical",
      ] as const),
      primary_subject_type: null,
      primary_subject_id: null,
      primary_subject_display: null,
      sla_due_at: null,
    } satisfies IShoppingMallRiskCase.ICreate;

    const created: IShoppingMallRiskCase =
      await api.functional.shoppingMall.admin.riskCases.create(connection, {
        body: createBody,
      });
    typia.assert<IShoppingMallRiskCase>(created);
    createdCases.push(created);
  }

  // Helper to convert stats to a map of status -> bucket
  const toBucketMap = (
    stats: IShoppingMallRiskCaseStatusStatistics,
  ): Map<string, IShoppingMallRiskCaseStatusStatistics.IStatusBucket> => {
    const map = new Map<
      string,
      IShoppingMallRiskCaseStatusStatistics.IStatusBucket
    >();
    for (const bucket of stats.buckets) map.set(bucket.status, bucket);
    return map;
  };

  const getBucketCount = (
    map: Map<string, IShoppingMallRiskCaseStatusStatistics.IStatusBucket>,
    status: string,
  ): number => {
    const bucket = map.get(status);
    return bucket ? bucket.count : 0;
  };

  const sumBucketCounts = (
    stats: IShoppingMallRiskCaseStatusStatistics,
  ): number => stats.buckets.reduce((acc, b) => acc + b.count, 0);

  // 3. Initial statistics snapshot
  const initialStats: IShoppingMallRiskCaseStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.riskCasesByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallRiskCaseStatusStatistics>(initialStats);

  const initialBucketMap = toBucketMap(initialStats);
  const totalCasesBefore = initialStats.totalCases;
  const openCountBefore = getBucketCount(initialBucketMap, "open");
  const closedCountBefore = getBucketCount(initialBucketMap, "closed");

  // Internal consistency: sum of counts equals totalCases
  TestValidator.equals(
    "initial sum(bucket.count) should equal totalCases",
    sumBucketCounts(initialStats),
    totalCasesBefore,
  );

  // 4. Transition some of the open cases to closed
  const TRANSITION_COUNT = 2; // M <= N
  const casesToClose = createdCases.slice(0, TRANSITION_COUNT);

  for (const riskCase of casesToClose) {
    const updateBody = {
      status: "closed",
    } satisfies IShoppingMallRiskCase.IUpdate;

    const updated: IShoppingMallRiskCase =
      await api.functional.shoppingMall.admin.riskCases.update(connection, {
        riskCaseCode: riskCase.case_code,
        body: updateBody,
      });
    typia.assert<IShoppingMallRiskCase>(updated);

    TestValidator.equals(
      "updated risk case should have closed status",
      updated.status,
      "closed",
    );
  }

  // 5. Statistics after status transitions
  const finalStats: IShoppingMallRiskCaseStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.riskCasesByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallRiskCaseStatusStatistics>(finalStats);

  const finalBucketMap = toBucketMap(finalStats);
  const totalCasesAfter = finalStats.totalCases;
  const openCountAfter = getBucketCount(finalBucketMap, "open");
  const closedCountAfter = getBucketCount(finalBucketMap, "closed");

  // Internal consistency for final snapshot
  TestValidator.equals(
    "final sum(bucket.count) should equal totalCases",
    sumBucketCounts(finalStats),
    totalCasesAfter,
  );

  // 6. Business invariants
  // totalCases remains consistent because we only changed status
  TestValidator.equals(
    "totalCases should remain unchanged after status transitions",
    totalCasesAfter,
    totalCasesBefore,
  );

  // Expect the open bucket to shrink by TRANSITION_COUNT, treating missing bucket as 0
  const expectedOpenAfter = Math.max(openCountBefore - TRANSITION_COUNT, 0);
  TestValidator.equals(
    "open bucket count should decrease by number of closed cases (bounded at 0)",
    openCountAfter,
    expectedOpenAfter,
  );

  // closed bucket should increase by at least TRANSITION_COUNT, accounting for pre-existing closed cases
  TestValidator.predicate(
    "closed bucket count should increase by at least number of closed cases",
    closedCountAfter >= closedCountBefore + TRANSITION_COUNT,
  );
}
