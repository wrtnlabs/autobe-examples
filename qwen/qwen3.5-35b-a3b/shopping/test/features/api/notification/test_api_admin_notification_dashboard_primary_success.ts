import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallNotificationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotificationDashboard";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_notification_dashboard_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new admin account
  const joinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Step 2: Create admin-specific connection with token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuthorized.token.access },
  };
  // Step 3: Call dashboard endpoint
  const dashboard =
    await api.functional.ecommerceMall.admin.notification.dashboard.at(
      adminConnection,
    );
  typia.assert(dashboard);
  // Step 4: Validate unread counts are non-negative
  TestValidator.predicate(
    "unreadCount is non-negative",
    dashboard.unreadCount >= 0,
  );
  TestValidator.predicate(
    "totalUnread is non-negative",
    dashboard.totalUnread >= 0,
  );
  // Step 5: Validate recentNotifications array structure
  TestValidator.predicate(
    "recentNotifications is array",
    Array.isArray(dashboard.recentNotifications),
  );
  TestValidator.predicate(
    "recentNotifications max 10 items",
    dashboard.recentNotifications.length <= 10,
  );
  // Step 6: Validate each notification has valid UUID and all required fields
  for (let i = 0; i < dashboard.recentNotifications.length; i++) {
    const notification = dashboard.recentNotifications[i];
    typia.assert(notification);
    // UUID format validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.predicate(
      `notification ${i} has valid UUID format`,
      uuidRegex.test(notification.id),
    );
  }
  // Step 7: Verify notifications are sorted by created_at descending
  for (let i = 0; i < dashboard.recentNotifications.length - 1; i++) {
    const current = dashboard.recentNotifications[i];
    const next = dashboard.recentNotifications[i + 1];
    TestValidator.predicate(
      `notifications sorted by created_at descending at index ${i}`,
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // Step 8: Validate systemAlert structure if present
  if (dashboard.systemAlert) {
    TestValidator.equals(
      "systemAlert has hasAlert boolean",
      typeof dashboard.systemAlert.hasAlert,
      "boolean",
    );
    if (dashboard.systemAlert.alertMessage !== undefined) {
      TestValidator.equals(
        "systemAlert.alertMessage is string",
        typeof dashboard.systemAlert.alertMessage,
        "string",
      );
    }
    if (dashboard.systemAlert.alertLevel !== undefined) {
      TestValidator.predicate(
        "systemAlert.alertLevel is valid",
        ["info", "warning", "critical"].includes(
          dashboard.systemAlert.alertLevel,
        ),
      );
    }
  }
}
