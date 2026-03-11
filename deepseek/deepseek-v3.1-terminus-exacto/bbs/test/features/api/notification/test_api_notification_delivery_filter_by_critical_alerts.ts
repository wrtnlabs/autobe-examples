import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering notifications by critical priority alerts to monitor urgent platform issues.
 * Apply filters for priority='critical' and notification_type='alert' to focus on high-priority
 * security or system alerts. Validate that only critical alert notifications are returned,
 * with correct status tracking (pending delivery, successfully delivered, or read by recipients).
 * Verify delivery timestamps are accurate and read status reflects user engagement with critical alerts.
 */
export async function test_api_notification_delivery_filter_by_critical_alerts(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test the notification delivery filtering with critical alerts
  const response =
    await api.functional.discussionBoard.superAdmin.notifications.delivery.index(
      superAdminConnection,
      {
        body: {
          priority: "critical",
          notification_type: "alert",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(response);
  // Validate that all returned notifications are critical alerts
  for (const notification of response.data) {
    TestValidator.equals(
      "notification priority should be critical",
      notification.priority,
      "critical",
    );
    TestValidator.equals(
      "notification type should be alert",
      notification.notification_type,
      "alert",
    );
    // Validate timestamp logic
    TestValidator.predicate("created_at should be valid ISO string", () => {
      return !isNaN(new Date(notification.created_at).getTime());
    });
    if (notification.delivered_at !== null) {
      TestValidator.predicate("delivered_at should be after created_at", () => {
        return (
          new Date(notification.delivered_at!) >
          new Date(notification.created_at)
        );
      });
    }
    if (notification.read_at !== null) {
      TestValidator.predicate("read_at should be after delivered_at", () => {
        return (
          notification.delivered_at !== null &&
          new Date(notification.read_at!) > new Date(notification.delivered_at!)
        );
      });
    }
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
}
