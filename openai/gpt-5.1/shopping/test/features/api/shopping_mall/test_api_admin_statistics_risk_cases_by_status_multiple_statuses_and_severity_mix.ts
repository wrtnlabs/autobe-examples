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
 * Validate that risk case status statistics reflect multiple cases across
 * different statuses.
 *
 * Business flow:
 *
 * 1. Join as an admin (POST /auth/admin/join) to obtain an authenticated admin
 *    context.
 * 2. As that admin, create several risk cases (POST /shoppingMall/admin/riskCases)
 *    with different lifecycle statuses (open, under_review, closed) and mixed
 *    severities.
 * 3. Call the statistics endpoint (GET
 *    /shoppingMall/admin/statistics/riskCasesByStatus) to retrieve aggregated
 *    status counts.
 * 4. Verify the structure and invariants of IShoppingMallRiskCaseStatusStatistics:
 *
 *    - TotalCases is non‑negative and matches the sum of bucket counts.
 *    - Each bucket has a non‑empty status and label, and a non‑negative count.
 *    - Optional percentage values (when present) are between 0 and 100.
 * 5. Cross‑check that for each status we created in this test, there is a
 *    corresponding bucket and that its count is at least the number of cases we
 *    created for that status (allowing for pre‑existing data).
 * 6. When percentage is present and totalCases > 0, ensure it is broadly
 *    consistent with count / totalCases within a small tolerance to allow for
 *    rounding.
 */
export async function test_api_admin_statistics_risk_cases_by_status_multiple_statuses_and_severity_mix(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create multiple risk cases with different statuses and severities.
  const statusPlan = [
    { status: "open", count: 3 },
    { status: "under_review", count: 2 },
    { status: "closed", count: 2 },
  ] as const;

  const severities = ["low", "medium", "high"] as const;

  const createdCountsByStatus = new Map<string, number>();

  let caseIndex = 0;

  for (const plan of statusPlan) {
    for (let i = 0; i < plan.count; i++) {
      const caseCode = `e2e-${plan.status}-${caseIndex}-${RandomGenerator.alphaNumeric(8)}`;
      const severity = RandomGenerator.pick(severities);

      const body = {
        case_code: caseCode,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        status: plan.status,
        severity,
        primary_subject_type: "order",
        primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
        primary_subject_display: RandomGenerator.alphaNumeric(10),
        sla_due_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IShoppingMallRiskCase.ICreate;

      const created: IShoppingMallRiskCase =
        await api.functional.shoppingMall.admin.riskCases.create(connection, {
          body,
        });
      typia.assert<IShoppingMallRiskCase>(created);

      const prev = createdCountsByStatus.get(plan.status) ?? 0;
      createdCountsByStatus.set(plan.status, prev + 1);

      caseIndex++;
    }
  }

  // 3. Call statistics endpoint.
  const stats: IShoppingMallRiskCaseStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.riskCasesByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallRiskCaseStatusStatistics>(stats);

  // 4. Validate structural invariants.
  TestValidator.predicate("totalCases is non-negative", stats.totalCases >= 0);

  TestValidator.predicate(
    "buckets array is not empty",
    stats.buckets.length > 0,
  );

  let sumCounts = 0;
  for (const bucket of stats.buckets) {
    TestValidator.predicate(
      `bucket status is non-empty for status '${bucket.status}'`,
      typeof bucket.status === "string" && bucket.status.length > 0,
    );

    TestValidator.predicate(
      `bucket label is non-empty for status '${bucket.status}'`,
      typeof bucket.label === "string" && bucket.label.length > 0,
    );

    TestValidator.predicate(
      `bucket count is non-negative for status '${bucket.status}'`,
      bucket.count >= 0,
    );

    if (bucket.percentage !== undefined) {
      TestValidator.predicate(
        `bucket percentage within 0-100 for status '${bucket.status}'`,
        bucket.percentage >= 0 && bucket.percentage <= 100,
      );
    }

    sumCounts += bucket.count;
  }

  // totalCases should equal the sum of bucket counts.
  TestValidator.equals(
    "totalCases equals sum of bucket counts",
    stats.totalCases,
    sumCounts,
  );

  // 5. Cross-check created statuses appear with at least created counts.
  const bucketByStatus = new Map<
    string,
    IShoppingMallRiskCaseStatusStatistics.IStatusBucket
  >();
  for (const bucket of stats.buckets) {
    bucketByStatus.set(bucket.status, bucket);
  }

  createdCountsByStatus.forEach((createdCount, status) => {
    const bucket = bucketByStatus.get(status);

    TestValidator.predicate(
      `statistics include bucket for created status '${status}'`,
      bucket !== undefined,
    );

    if (bucket !== undefined) {
      TestValidator.predicate(
        `bucket count >= number of created cases for status '${status}'`,
        bucket.count >= createdCount,
      );
    }
  });

  // 6. Check percentage consistency when present.
  if (stats.totalCases > 0) {
    for (const bucket of stats.buckets) {
      if (bucket.percentage !== undefined) {
        const expectedProportion = bucket.count / stats.totalCases;
        const actualProportion = bucket.percentage / 100;
        const diff = Math.abs(expectedProportion - actualProportion);

        TestValidator.predicate(
          `bucket percentage roughly matches count / totalCases for status '${bucket.status}'`,
          diff <= 0.05 || bucket.count === 0,
        );
      }
    }
  }
}
