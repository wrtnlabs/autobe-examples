import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotificationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotificationSummary";

/**
 * Validate access control for the admin dashboard notifications summary
 * endpoint.
 *
 * Business objective: Ensure that the notifications summary at GET
 * /shoppingMall/admin/adminDashboard/notifications/summary is only accessible
 * to authenticated administrator actors created through POST /auth/admin/join,
 * and that unauthenticated access is rejected.
 *
 * Test steps:
 *
 * 1. Construct an unauthenticated connection derived from the provided connection,
 *    with empty headers, and attempt to call the summary endpoint. Expect the
 *    call to fail (any error), without inspecting specific HTTP status codes.
 * 2. Using the original connection, register a new admin via
 *    api.functional.auth.admin.join, passing a valid
 *    IShoppingMallAdminJoin.ICreate body generated via typia.random.
 *
 *    - Validate the returned IShoppingMallAdmin.IAuthorized object with
 *         typia.assert.
 *    - The join call automatically attaches the admin access token to the connection
 *         headers.
 * 3. With the now-authenticated connection, call
 *    api.functional.shoppingMall.admin.adminDashboard.notifications.summary.at.
 *
 *    - Validate the returned IShoppingMallAdminNotificationSummary using
 *         typia.assert.
 * 4. Perform additional business-level validations on the summary:
 *
 *    - UnreadNotifications and totalNotifications are non-negative and
 *         unreadNotifications <= totalNotifications.
 *    - For each byCategory entry:
 *
 *         - TotalCount, unreadCount, overdueCount are non-negative.
 *         - UnreadCount <= totalCount and overdueCount <= totalCount.
 *    - For each bySeverity entry:
 *
 *         - TotalCount and unreadCount are non-negative.
 *         - UnreadCount <= totalCount.
 *    - If recentHighlight is present:
 *
 *         - HasHighlight is a boolean.
 *         - If recentCriticalCount is present, it is non-negative.
 *         - If topCategories is present, all nested counts obey the same non-negativity
 *                   and consistency rules as byCategory.
 */
export async function test_api_admin_notification_summary_access_control(
  connection: api.IConnection,
) {
  // 1. Attempt to access summary without authentication using a cloned connection
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access to admin notification summary must fail",
    async () => {
      await api.functional.shoppingMall.admin.adminDashboard.notifications.summary.at(
        unauthenticated,
      );
    },
  );

  // 2. Register a new admin via POST /auth/admin/join
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 3. Authenticated admin calls the notifications summary endpoint
  const summary =
    await api.functional.shoppingMall.admin.adminDashboard.notifications.summary.at(
      connection,
    );
  typia.assert<IShoppingMallAdminNotificationSummary>(summary);

  // 4. Business-level validations on the returned summary
  TestValidator.predicate(
    "totalNotifications must be non-negative",
    summary.totalNotifications >= 0,
  );
  TestValidator.predicate(
    "unreadNotifications must be non-negative",
    summary.unreadNotifications >= 0,
  );
  TestValidator.predicate(
    "unreadNotifications must not exceed totalNotifications",
    summary.unreadNotifications <= summary.totalNotifications,
  );

  // Validate byCategory entries
  for (const category of summary.byCategory) {
    TestValidator.predicate(
      `category totalCount must be non-negative for ${category.categoryCode}`,
      category.totalCount >= 0,
    );
    TestValidator.predicate(
      `category unreadCount must be non-negative for ${category.categoryCode}`,
      category.unreadCount >= 0,
    );
    TestValidator.predicate(
      `category overdueCount must be non-negative for ${category.categoryCode}`,
      category.overdueCount >= 0,
    );
    TestValidator.predicate(
      `category unreadCount must not exceed totalCount for ${category.categoryCode}`,
      category.unreadCount <= category.totalCount,
    );
    TestValidator.predicate(
      `category overdueCount must not exceed totalCount for ${category.categoryCode}`,
      category.overdueCount <= category.totalCount,
    );
  }

  // Validate bySeverity entries
  for (const severity of summary.bySeverity) {
    TestValidator.predicate(
      `severity totalCount must be non-negative for ${severity.severity}`,
      severity.totalCount >= 0,
    );
    TestValidator.predicate(
      `severity unreadCount must be non-negative for ${severity.severity}`,
      severity.unreadCount >= 0,
    );
    TestValidator.predicate(
      `severity unreadCount must not exceed totalCount for ${severity.severity}`,
      severity.unreadCount <= severity.totalCount,
    );
  }

  // Validate recentHighlight if present
  if (summary.recentHighlight !== undefined) {
    const highlight = summary.recentHighlight;

    TestValidator.predicate(
      "recentHighlight.hasHighlight must be boolean true or false",
      highlight.hasHighlight === true || highlight.hasHighlight === false,
    );

    if (highlight.recentCriticalCount !== undefined) {
      TestValidator.predicate(
        "recentCriticalCount must be non-negative when present",
        highlight.recentCriticalCount >= 0,
      );
    }

    if (highlight.topCategories !== undefined) {
      for (const category of highlight.topCategories) {
        TestValidator.predicate(
          `highlight top category totalCount must be non-negative for ${category.categoryCode}`,
          category.totalCount >= 0,
        );
        TestValidator.predicate(
          `highlight top category unreadCount must be non-negative for ${category.categoryCode}`,
          category.unreadCount >= 0,
        );
        TestValidator.predicate(
          `highlight top category overdueCount must be non-negative for ${category.categoryCode}`,
          category.overdueCount >= 0,
        );
        TestValidator.predicate(
          `highlight top category unreadCount must not exceed totalCount for ${category.categoryCode}`,
          category.unreadCount <= category.totalCount,
        );
        TestValidator.predicate(
          `highlight top category overdueCount must not exceed totalCount for ${category.categoryCode}`,
          category.overdueCount <= category.totalCount,
        );
      }
    }
  }
}
