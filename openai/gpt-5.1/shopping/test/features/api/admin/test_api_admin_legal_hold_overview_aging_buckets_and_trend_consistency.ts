import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldOverview";

export async function test_api_admin_legal_hold_overview_aging_buckets_and_trend_consistency(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Call the legal hold overview endpoint as admin
  const overview: IShoppingMallLegalHoldOverview =
    await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
      connection,
    );
  typia.assert<IShoppingMallLegalHoldOverview>(overview);

  // 3. Basic invariants on aggregate counts
  TestValidator.predicate(
    "totalActiveHolds must be non-negative",
    overview.totalActiveHolds >= 0,
  );

  // Sum of subject-type counts should be >= 0 and not obviously inconsistent
  const subjectSum =
    overview.activeHoldsBySubjectType.customer +
    overview.activeHoldsBySubjectType.seller +
    overview.activeHoldsBySubjectType.order +
    overview.activeHoldsBySubjectType.dispute +
    overview.activeHoldsBySubjectType.riskCase;

  TestValidator.predicate(
    "sum of activeHoldsBySubjectType is non-negative",
    subjectSum >= 0,
  );

  // 4. Validate agingBuckets
  for (const bucket of overview.agingBuckets) {
    // label non-empty
    TestValidator.predicate(
      `aging bucket label must be non-empty: ${bucket.label}`,
      bucket.label.length > 0,
    );

    // minDays >= 0 is enforced by type, but assert business logic anyway
    TestValidator.predicate(
      `aging bucket minDays must be >= 0 for label ${bucket.label}`,
      bucket.minDays >= 0,
    );

    if (bucket.maxDays !== undefined) {
      TestValidator.predicate(
        `aging bucket maxDays must be >= minDays for label ${bucket.label}`,
        bucket.maxDays >= bucket.minDays,
      );
    }

    TestValidator.predicate(
      `aging bucket count must be >= 0 for label ${bucket.label}`,
      bucket.count >= 0,
    );
  }

  // 5. Validate recentActivity consistency: netChange = createdCount - releasedCount
  const recent = overview.recentActivity;
  const expectedNetChange = recent.createdCount - recent.releasedCount;
  TestValidator.equals(
    "recentActivity.netChange must equal createdCount - releasedCount",
    recent.netChange,
    expectedNetChange,
  );

  // 6. Validate trend.points time series
  const points = overview.trend.points;

  // Ensure no duplicate dates and non-decreasing ordering
  const seenDates = new Set<string>();
  let lastDate: string | null = null;

  for (const point of points) {
    // activeCount must be non-negative (already by type, but assert business rule)
    TestValidator.predicate(
      `trend point activeCount must be >= 0 for date ${point.date}`,
      point.activeCount >= 0,
    );

    // Date ordering: non-decreasing chronological order
    if (lastDate !== null) {
      TestValidator.predicate(
        `trend dates must be in non-decreasing order: ${lastDate} <= ${point.date}`,
        lastDate <= point.date,
      );
    }

    TestValidator.predicate(
      `trend point date must be unique in the series: ${point.date}`,
      !seenDates.has(point.date),
    );

    seenDates.add(point.date);
    lastDate = point.date;
  }

  // 7. Optional consistency check between last trend point and totalActiveHolds.
  if (points.length > 0) {
    const lastPoint = points[points.length - 1];

    TestValidator.predicate(
      "last trend point activeCount must be non-negative",
      lastPoint.activeCount >= 0,
    );

    // Do a very loose sanity check: last activeCount should not be wildly
    // larger than totalActiveHolds in a way that suggests a data bug.
    if (overview.totalActiveHolds > 0) {
      const upperBound = overview.totalActiveHolds * 10 + 1000;
      TestValidator.predicate(
        "last trend activeCount should be within a loose upper bound of totalActiveHolds",
        lastPoint.activeCount <= upperBound,
      );
    }
  }
}
