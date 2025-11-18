import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldOverview";

export async function test_api_admin_legal_hold_overview_multiple_admins_access(
  connection: api.IConnection,
) {
  // 1. Admin A joins and authenticates on the primary connection
  const adminAInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminA = await api.functional.auth.admin.join(connection, {
    body: adminAInput,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminA);

  // 2. Fetch legal hold overview as admin A
  const overviewA: IShoppingMallLegalHoldOverview =
    await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
      connection,
    );
  typia.assert<IShoppingMallLegalHoldOverview>(overviewA);

  // Basic structural and business invariants on admin A's view
  TestValidator.predicate(
    "admin A - totalActiveHolds is non-negative",
    overviewA.totalActiveHolds >= 0,
  );
  TestValidator.predicate(
    "admin A - customer subject holds is non-negative",
    overviewA.activeHoldsBySubjectType.customer >= 0,
  );
  TestValidator.predicate(
    "admin A - seller subject holds is non-negative",
    overviewA.activeHoldsBySubjectType.seller >= 0,
  );
  TestValidator.predicate(
    "admin A - order subject holds is non-negative",
    overviewA.activeHoldsBySubjectType.order >= 0,
  );
  TestValidator.predicate(
    "admin A - dispute subject holds is non-negative",
    overviewA.activeHoldsBySubjectType.dispute >= 0,
  );
  TestValidator.predicate(
    "admin A - riskCase subject holds is non-negative",
    overviewA.activeHoldsBySubjectType.riskCase >= 0,
  );

  // Validate aging buckets for admin A
  for (const bucket of overviewA.agingBuckets) {
    TestValidator.predicate(
      "admin A - aging bucket minDays is non-negative",
      bucket.minDays >= 0,
    );
    if (bucket.maxDays !== undefined) {
      TestValidator.predicate(
        "admin A - aging bucket maxDays is non-negative",
        bucket.maxDays >= 0,
      );
    }
    TestValidator.predicate(
      "admin A - aging bucket count is non-negative",
      bucket.count >= 0,
    );
  }

  // Validate recent activity window on admin A
  TestValidator.predicate(
    "admin A - recentActivity.windowDays is at least 1",
    overviewA.recentActivity.windowDays >= 1,
  );
  TestValidator.predicate(
    "admin A - recentActivity.createdCount is non-negative",
    overviewA.recentActivity.createdCount >= 0,
  );
  TestValidator.predicate(
    "admin A - recentActivity.releasedCount is non-negative",
    overviewA.recentActivity.releasedCount >= 0,
  );

  // Validate trend points for admin A
  for (const point of overviewA.trend.points) {
    TestValidator.predicate(
      "admin A - trend point activeCount is non-negative",
      point.activeCount >= 0,
    );
  }

  // 3. Prepare a fresh connection for admin B to avoid header interference
  const connectionForAdminB: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Admin B joins and authenticates on the fresh connection
  const adminBInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminB = await api.functional.auth.admin.join(connectionForAdminB, {
    body: adminBInput,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);

  // 5. Fetch legal hold overview as admin B
  const overviewB: IShoppingMallLegalHoldOverview =
    await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
      connectionForAdminB,
    );
  typia.assert<IShoppingMallLegalHoldOverview>(overviewB);

  // Basic structural and business invariants on admin B's view
  TestValidator.predicate(
    "admin B - totalActiveHolds is non-negative",
    overviewB.totalActiveHolds >= 0,
  );
  TestValidator.predicate(
    "admin B - customer subject holds is non-negative",
    overviewB.activeHoldsBySubjectType.customer >= 0,
  );
  TestValidator.predicate(
    "admin B - seller subject holds is non-negative",
    overviewB.activeHoldsBySubjectType.seller >= 0,
  );
  TestValidator.predicate(
    "admin B - order subject holds is non-negative",
    overviewB.activeHoldsBySubjectType.order >= 0,
  );
  TestValidator.predicate(
    "admin B - dispute subject holds is non-negative",
    overviewB.activeHoldsBySubjectType.dispute >= 0,
  );
  TestValidator.predicate(
    "admin B - riskCase subject holds is non-negative",
    overviewB.activeHoldsBySubjectType.riskCase >= 0,
  );

  for (const bucket of overviewB.agingBuckets) {
    TestValidator.predicate(
      "admin B - aging bucket minDays is non-negative",
      bucket.minDays >= 0,
    );
    if (bucket.maxDays !== undefined) {
      TestValidator.predicate(
        "admin B - aging bucket maxDays is non-negative",
        bucket.maxDays >= 0,
      );
    }
    TestValidator.predicate(
      "admin B - aging bucket count is non-negative",
      bucket.count >= 0,
    );
  }

  TestValidator.predicate(
    "admin B - recentActivity.windowDays is at least 1",
    overviewB.recentActivity.windowDays >= 1,
  );
  TestValidator.predicate(
    "admin B - recentActivity.createdCount is non-negative",
    overviewB.recentActivity.createdCount >= 0,
  );
  TestValidator.predicate(
    "admin B - recentActivity.releasedCount is non-negative",
    overviewB.recentActivity.releasedCount >= 0,
  );

  for (const point of overviewB.trend.points) {
    TestValidator.predicate(
      "admin B - trend point activeCount is non-negative",
      point.activeCount >= 0,
    );
  }

  // 6. Cross-admin consistency: both admins should see the same aggregate view
  TestValidator.equals(
    "legal hold overview totalActiveHolds is identical across admins",
    overviewA.totalActiveHolds,
    overviewB.totalActiveHolds,
  );
  TestValidator.equals(
    "legal hold overview activeHoldsBySubjectType is identical across admins",
    overviewA.activeHoldsBySubjectType,
    overviewB.activeHoldsBySubjectType,
  );
  TestValidator.equals(
    "legal hold overview agingBuckets is identical across admins",
    overviewA.agingBuckets,
    overviewB.agingBuckets,
  );
  TestValidator.equals(
    "legal hold overview recentActivity is identical across admins",
    overviewA.recentActivity,
    overviewB.recentActivity,
  );
  TestValidator.equals(
    "legal hold overview trend is identical across admins",
    overviewA.trend,
    overviewB.trend,
  );
}
