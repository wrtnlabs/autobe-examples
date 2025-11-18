import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotificationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotificationSummary";

/**
 * Basic overview test for the admin dashboard notifications summary.
 *
 * Business goal:
 *
 * - Verify that an authenticated shopping mall admin can successfully retrieve
 *   the notifications summary for the admin dashboard.
 * - Validate that the summary structure is coherent and respects business-level
 *   expectations (non-negative counters, non-empty identifiers where required),
 *   independent of whether there are actual notifications in the database.
 *
 * Steps:
 *
 * 1. Register a new admin via POST /auth/admin/join.
 *
 *    - Use IShoppingMallAdminJoin.ICreate for request body.
 *    - Rely on the SDK to automatically configure Authorization header in the
 *         connection using the returned token.access.
 * 2. Call GET /shoppingMall/admin/adminDashboard/notifications/summary using
 *    api.functional.shoppingMall.admin.adminDashboard.notifications.summary.at.
 * 3. Assert that the response conforms to IShoppingMallAdminNotificationSummary
 *    using typia.assert.
 * 4. Perform business sanity checks:
 *
 *    - TotalNotifications and unreadNotifications are integers and >= 0.
 *    - OverdueCount is >= 0.
 *    - ByCategory is an array; for each element:
 *
 *         - CategoryCode and label are non-empty strings.
 *         - TotalCount, unreadCount, overdueCount are >= 0.
 *    - BySeverity is an array; for each element:
 *
 *         - Severity is a non-empty string.
 *         - TotalCount, unreadCount are >= 0.
 *    - If recentHighlight exists and hasHighlight is true:
 *
 *         - MostRecentCreatedAt is defined and a valid ISO date-time string (already
 *                   guaranteed by typia, so we only check presence).
 *         - RecentCriticalCount is defined and >= 0.
 * 5. The test should be robust even when the underlying notifications table is
 *    empty: we do not assert on exact counts, only non-negativity and
 *    structural validity.
 */
export async function test_api_admin_notification_summary_basic_overview(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join) to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional; send null to exercise null-capable field safely
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Call the notifications summary endpoint with the authenticated connection
  const summary: IShoppingMallAdminNotificationSummary =
    await api.functional.shoppingMall.admin.adminDashboard.notifications.summary.at(
      connection,
    );
  typia.assert<IShoppingMallAdminNotificationSummary>(summary);

  // 3. Top-level numeric counters should be non-negative integers.
  TestValidator.predicate(
    "totalNotifications must be non-negative",
    summary.totalNotifications >= 0,
  );
  TestValidator.predicate(
    "unreadNotifications must be non-negative",
    summary.unreadNotifications >= 0,
  );
  TestValidator.predicate(
    "overdueCount must be non-negative",
    summary.overdueCount >= 0,
  );

  // 4. Category breakdown sanity checks
  TestValidator.predicate(
    "byCategory array length must be >= 0",
    summary.byCategory.length >= 0,
  );
  for (const category of summary.byCategory) {
    TestValidator.predicate(
      "category.categoryCode must be non-empty",
      category.categoryCode.length > 0,
    );
    TestValidator.predicate(
      "category.label must be non-empty",
      category.label.length > 0,
    );
    TestValidator.predicate(
      "category.totalCount must be non-negative",
      category.totalCount >= 0,
    );
    TestValidator.predicate(
      "category.unreadCount must be non-negative",
      category.unreadCount >= 0,
    );
    TestValidator.predicate(
      "category.overdueCount must be non-negative",
      category.overdueCount >= 0,
    );
  }

  // 5. Severity breakdown sanity checks
  TestValidator.predicate(
    "bySeverity array length must be >= 0",
    summary.bySeverity.length >= 0,
  );
  for (const sev of summary.bySeverity) {
    TestValidator.predicate(
      "severity.severity must be non-empty",
      sev.severity.length > 0,
    );
    TestValidator.predicate(
      "severity.totalCount must be non-negative",
      sev.totalCount >= 0,
    );
    TestValidator.predicate(
      "severity.unreadCount must be non-negative",
      sev.unreadCount >= 0,
    );
  }

  // 6. Recent highlight sanity checks
  const recent = summary.recentHighlight;
  if (recent !== undefined) {
    if (recent.hasHighlight === true) {
      // When highlight is present, mostRecentCreatedAt and recentCriticalCount
      // should be defined and sensible (non-negative count). Detailed type
      // correctness is already enforced by typia.
      TestValidator.predicate(
        "recentHighlight.mostRecentCreatedAt must be defined when hasHighlight is true",
        recent.mostRecentCreatedAt !== undefined,
      );
      TestValidator.predicate(
        "recentHighlight.recentCriticalCount must be defined when hasHighlight is true",
        recent.recentCriticalCount !== undefined,
      );
      if (recent.recentCriticalCount !== undefined) {
        TestValidator.predicate(
          "recentHighlight.recentCriticalCount must be non-negative when defined",
          recent.recentCriticalCount >= 0,
        );
      }
    }
  }
}
