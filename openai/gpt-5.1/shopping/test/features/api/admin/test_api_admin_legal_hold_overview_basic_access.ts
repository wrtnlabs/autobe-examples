import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldOverview";

/**
 * Verify that an authenticated admin can retrieve the legal hold overview
 * dashboard and that the returned structure is a safe, aggregate-only summary.
 *
 * Business flow:
 *
 * 1. Perform an admin join via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate.
 *
 *    - This both creates the administrator account and establishes an authenticated
 *         admin session via the SDK’s header management.
 * 2. With the authenticated admin connection, call GET
 *    /shoppingMall/admin/adminDashboard/legalHoldOverview through
 *    api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at.
 * 3. Assert the response type against IShoppingMallLegalHoldOverview using
 *    typia.assert, which guarantees strict schema compliance.
 * 4. Run additional business-level validations:
 *
 *    - TotalActiveHolds is an int32 >= 0.
 *    - ActiveHoldsBySubjectType exists and each bucket (customer, seller, order,
 *         dispute, riskCase) is an int32 >= 0.
 *    - Each agingBuckets entry has minDays >= 0, optional maxDays >= minDays when
 *         present, and count >= 0.
 *    - RecentActivity.windowDays >= 1 and netChange equals createdCount -
 *         releasedCount.
 *    - Trend.points array entries have a valid ISO date (YYYY-MM-DD) and activeCount
 *
 * > = 0.
 * 5. Sanity-check that the overview DTO does not surface obvious PII such as
 *    administrator or customer emails or names, only aggregated metrics.
 */
export async function test_api_admin_legal_hold_overview_basic_access(
  connection: api.IConnection,
) {
  // 1. Join as a new admin to obtain authenticated context
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
  typia.assert(authorizedAdmin);

  // 2. Call legal hold overview dashboard as authenticated admin
  const overview: IShoppingMallLegalHoldOverview =
    await api.functional.shoppingMall.admin.adminDashboard.legalHoldOverview.at(
      connection,
    );
  typia.assert(overview);

  // 3. Basic aggregate non-negativity checks
  TestValidator.predicate(
    "totalActiveHolds is non-negative",
    overview.totalActiveHolds >= 0,
  );

  TestValidator.predicate(
    "activeHoldsBySubjectType.customer is non-negative",
    overview.activeHoldsBySubjectType.customer >= 0,
  );
  TestValidator.predicate(
    "activeHoldsBySubjectType.seller is non-negative",
    overview.activeHoldsBySubjectType.seller >= 0,
  );
  TestValidator.predicate(
    "activeHoldsBySubjectType.order is non-negative",
    overview.activeHoldsBySubjectType.order >= 0,
  );
  TestValidator.predicate(
    "activeHoldsBySubjectType.dispute is non-negative",
    overview.activeHoldsBySubjectType.dispute >= 0,
  );
  TestValidator.predicate(
    "activeHoldsBySubjectType.riskCase is non-negative",
    overview.activeHoldsBySubjectType.riskCase >= 0,
  );

  // 4. Validate aging buckets structure and ranges
  for (const bucket of overview.agingBuckets) {
    TestValidator.predicate(
      `aging bucket '${bucket.label}' has minDays >= 0`,
      bucket.minDays >= 0,
    );

    if (bucket.maxDays !== undefined) {
      TestValidator.predicate(
        `aging bucket '${bucket.label}' has maxDays >= minDays`,
        bucket.maxDays >= bucket.minDays,
      );
    }

    TestValidator.predicate(
      `aging bucket '${bucket.label}' has non-negative count`,
      bucket.count >= 0,
    );
  }

  // 5. Validate recent activity window and netChange consistency
  const recent = overview.recentActivity;

  TestValidator.predicate(
    "recentActivity.windowDays >= 1",
    recent.windowDays >= 1,
  );

  TestValidator.predicate(
    "recentActivity.createdCount is non-negative",
    recent.createdCount >= 0,
  );

  TestValidator.predicate(
    "recentActivity.releasedCount is non-negative",
    recent.releasedCount >= 0,
  );

  TestValidator.equals(
    "recentActivity.netChange equals createdCount - releasedCount",
    recent.netChange,
    recent.createdCount - recent.releasedCount,
  );

  // 6. Validate trend points date format and activeCount non-negativity
  const dateRegex = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

  for (const point of overview.trend.points) {
    TestValidator.predicate(
      `trend point date '${point.date}' matches YYYY-MM-DD`,
      dateRegex.test(point.date),
    );

    TestValidator.predicate(
      `trend point for date '${point.date}' has non-negative activeCount`,
      point.activeCount >= 0,
    );
  }

  // 7. PII surface sanity check: overview itself should not expose obvious
  // email fields; we only check that top-level and known nested aggregates do
  // not include the admin email we joined with.
  TestValidator.predicate(
    "overview JSON does not directly contain admin email from join",
    JSON.stringify(overview).includes(joinBody.email) === false,
  );
}
