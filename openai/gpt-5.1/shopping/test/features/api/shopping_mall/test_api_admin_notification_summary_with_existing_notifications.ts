import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotificationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotificationSummary";

export async function test_api_admin_notification_summary_with_existing_notifications(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  // Basic sanity checks on authorized admin
  TestValidator.predicate(
    "admin id should be a non-empty string",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.predicate(
    "admin email should match email format",
    typeof authorized.email === "string" && authorized.email.length > 0,
  );
  TestValidator.predicate(
    "access token string should be non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );

  // 2. Call notifications summary endpoint
  const summary: IShoppingMallAdminNotificationSummary =
    await api.functional.shoppingMall.admin.adminDashboard.notifications.summary.at(
      connection,
    );
  typia.assert<IShoppingMallAdminNotificationSummary>(summary);

  const {
    totalNotifications,
    unreadNotifications,
    byCategory,
    bySeverity,
    overdueCount,
    recentHighlight,
  } = summary;

  // 3. Global counters must be non-negative and consistent
  TestValidator.predicate(
    "totalNotifications should be non-negative",
    totalNotifications >= 0,
  );
  TestValidator.predicate(
    "unreadNotifications should be non-negative",
    unreadNotifications >= 0,
  );
  TestValidator.predicate(
    "unreadNotifications must not exceed totalNotifications",
    unreadNotifications <= totalNotifications,
  );
  TestValidator.predicate(
    "overdueCount should be non-negative",
    overdueCount >= 0,
  );

  // 4. Category summaries - local non-negativity and relation to global totals
  let maxTotalByCategory = 0;
  let maxUnreadByCategory = 0;
  let maxOverdueByCategory = 0;

  for (const category of byCategory) {
    TestValidator.predicate(
      "category totalCount should be non-negative",
      category.totalCount >= 0,
    );
    TestValidator.predicate(
      "category unreadCount should be non-negative",
      category.unreadCount >= 0,
    );
    TestValidator.predicate(
      "category overdueCount should be non-negative",
      category.overdueCount >= 0,
    );
    TestValidator.predicate(
      "category unreadCount must not exceed totalCount",
      category.unreadCount <= category.totalCount,
    );

    if (category.totalCount > maxTotalByCategory)
      maxTotalByCategory = category.totalCount;
    if (category.unreadCount > maxUnreadByCategory)
      maxUnreadByCategory = category.unreadCount;
    if (category.overdueCount > maxOverdueByCategory)
      maxOverdueByCategory = category.overdueCount;
  }

  if (byCategory.length > 0) {
    TestValidator.predicate(
      "totalNotifications should be at least as large as max category totalCount",
      totalNotifications >= maxTotalByCategory,
    );
    TestValidator.predicate(
      "unreadNotifications should be at least as large as max category unreadCount",
      unreadNotifications >= maxUnreadByCategory,
    );
    TestValidator.predicate(
      "overdueCount should be at least as large as max category overdueCount",
      overdueCount >= maxOverdueByCategory,
    );
  }

  // 5. Severity summaries - local non-negativity and relation to global totals
  let maxTotalBySeverity = 0;
  let maxUnreadBySeverity = 0;

  for (const severity of bySeverity) {
    TestValidator.predicate(
      "severity totalCount should be non-negative",
      severity.totalCount >= 0,
    );
    TestValidator.predicate(
      "severity unreadCount should be non-negative",
      severity.unreadCount >= 0,
    );
    TestValidator.predicate(
      "severity unreadCount must not exceed totalCount",
      severity.unreadCount <= severity.totalCount,
    );

    if (severity.totalCount > maxTotalBySeverity)
      maxTotalBySeverity = severity.totalCount;
    if (severity.unreadCount > maxUnreadBySeverity)
      maxUnreadBySeverity = severity.unreadCount;
  }

  if (bySeverity.length > 0) {
    TestValidator.predicate(
      "totalNotifications should be at least as large as max severity totalCount",
      totalNotifications >= maxTotalBySeverity,
    );
    TestValidator.predicate(
      "unreadNotifications should be at least as large as max severity unreadCount",
      unreadNotifications >= maxUnreadBySeverity,
    );
  }

  // 6. recentHighlight coherence when present
  if (recentHighlight !== undefined) {
    typia.assert<IShoppingMallAdminNotificationSummary.IRecentHighlight>(
      recentHighlight,
    );

    if (recentHighlight.hasHighlight === true) {
      if (recentHighlight.recentCriticalCount !== undefined) {
        TestValidator.predicate(
          "recentCriticalCount should be non-negative when highlight is present",
          recentHighlight.recentCriticalCount >= 0,
        );
      }

      if (recentHighlight.topCategories !== undefined) {
        const topCategories = recentHighlight.topCategories;

        // Build a lookup map of valid category codes from the main byCategory list
        const validCategoryCodes = new Set(
          byCategory.map((c) => c.categoryCode),
        );

        for (const top of topCategories) {
          // Non-negative counters for top categories
          TestValidator.predicate(
            "top category totalCount should be non-negative",
            top.totalCount >= 0,
          );
          TestValidator.predicate(
            "top category unreadCount should be non-negative",
            top.unreadCount >= 0,
          );
          TestValidator.predicate(
            "top category overdueCount should be non-negative",
            top.overdueCount >= 0,
          );
          TestValidator.predicate(
            "top category unreadCount must not exceed totalCount",
            top.unreadCount <= top.totalCount,
          );

          // If we have any byCategory entries at all, each top category should map
          // to one of the category codes from the main summary.
          if (byCategory.length > 0) {
            TestValidator.predicate(
              "top category code should exist in main byCategory list when categories are present",
              validCategoryCodes.has(top.categoryCode),
            );
          }
        }
      }
    }
  }
}
