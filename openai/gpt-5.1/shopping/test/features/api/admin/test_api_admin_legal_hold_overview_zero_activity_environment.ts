import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldOverview";

/**
 * Validate admin legal hold overview metrics in a zero-activity environment.
 *
 * Business purpose: Ensure that the admin legal hold dashboard endpoint returns
 * a structurally valid IShoppingMallLegalHoldOverview object with all counts
 * and aggregates at their zero or empty baselines when there are no legal hold
 * records in the system, instead of throwing errors or returning null/undefined
 * values.
 *
 * High level steps:
 *
 * 1. Register a fresh admin via POST /auth/admin/join to obtain an authenticated
 *    admin context (SDK will inject the access token into connection.headers
 *    automatically).
 * 2. Call GET /shoppingMall/admin/adminDashboard/legalHoldOverview.
 * 3. Validate the response type with typia.assert.
 * 4. Assert zeroed metrics for totalActiveHolds and activeHoldsBySubjectType.
 * 5. Assert that agingBuckets is either empty or contains only zero-count buckets
 *    with sane day ranges.
 * 6. Assert that recentActivity shows a non-zero windowDays but all counts
 *    (created, released, netChange) equal 0.
 * 7. Assert that trend.points is either empty or that every point has activeCount
 *    === 0 (no historical active holds) while remaining structurally valid.
 */
export async function test_api_admin_legal_hold_overview_zero_activity_environment(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to establish admin-authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional IP: simulate absence so backend can derive from request
    ip: null,
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Call legal hold overview endpoint with admin-authenticated connection
  const overview =
    await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
      connection,
    );
  typia.assert<IShoppingMallLegalHoldOverview>(overview);

  // 3. Validate totalActiveHolds is zero
  TestValidator.equals(
    "totalActiveHolds must be zero in a clean environment",
    overview.totalActiveHolds,
    0,
  );

  // 4. Validate activeHoldsBySubjectType breakdown is all zeros
  TestValidator.equals(
    "active legal holds for customers must be zero",
    overview.activeHoldsBySubjectType.customer,
    0,
  );
  TestValidator.equals(
    "active legal holds for sellers must be zero",
    overview.activeHoldsBySubjectType.seller,
    0,
  );
  TestValidator.equals(
    "active legal holds for orders must be zero",
    overview.activeHoldsBySubjectType.order,
    0,
  );
  TestValidator.equals(
    "active legal holds for disputes must be zero",
    overview.activeHoldsBySubjectType.dispute,
    0,
  );
  TestValidator.equals(
    "active legal holds for risk cases must be zero",
    overview.activeHoldsBySubjectType.riskCase,
    0,
  );

  // 5. Validate agingBuckets: either empty or all zero-count buckets with sane ranges
  if (overview.agingBuckets.length === 0) {
    TestValidator.predicate(
      "agingBuckets may be an empty array in zero-activity environment",
      true,
    );
  } else {
    for (const bucket of overview.agingBuckets) {
      // All counts must be zero
      TestValidator.equals(
        `aging bucket '${bucket.label}' must have zero count`,
        bucket.count,
        0,
      );

      // label should be non-empty to be useful in dashboards
      TestValidator.predicate(
        `aging bucket '${bucket.label}' label should be non-empty`,
        bucket.label.length > 0,
      );

      // minDays must be non-negative (already ensured by type, but we assert business-wise)
      TestValidator.predicate(
        `aging bucket '${bucket.label}' minDays should be >= 0`,
        bucket.minDays >= 0,
      );

      if (bucket.maxDays !== undefined) {
        TestValidator.predicate(
          `aging bucket '${bucket.label}' maxDays should be >= minDays when present`,
          bucket.maxDays >= bucket.minDays,
        );
      }
    }
  }

  // 6. Validate recentActivity window and zeroed counts
  TestValidator.predicate(
    "recentActivity.windowDays must be at least 1",
    overview.recentActivity.windowDays >= 1,
  );
  TestValidator.equals(
    "recentActivity.createdCount must be zero in zero-activity environment",
    overview.recentActivity.createdCount,
    0,
  );
  TestValidator.equals(
    "recentActivity.releasedCount must be zero in zero-activity environment",
    overview.recentActivity.releasedCount,
    0,
  );
  TestValidator.equals(
    "recentActivity.netChange must be zero in zero-activity environment",
    overview.recentActivity.netChange,
    0,
  );

  // 7. Validate trend series: either empty or all points with activeCount zero
  if (overview.trend.points.length === 0) {
    TestValidator.predicate(
      "trend.points may be an empty array in zero-activity environment",
      true,
    );
  } else {
    for (const point of overview.trend.points) {
      TestValidator.equals(
        `trend point on ${point.date} must have activeCount zero in zero-activity environment`,
        point.activeCount,
        0,
      );
    }
  }
}
