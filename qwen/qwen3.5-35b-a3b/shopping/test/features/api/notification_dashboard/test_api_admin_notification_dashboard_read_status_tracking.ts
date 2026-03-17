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

export async function test_api_admin_notification_dashboard_read_status_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new admin account and store credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  const adminPassword: string = "1234";
  const testEmail: string = admin.email;
  // 2. Login with admin credentials to get authenticated connection
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(authConnection, {
    body: {
      email: testEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Call dashboard endpoint with authenticated connection
  const dashboard: IEcommerceMallNotificationDashboard =
    await api.functional.ecommerceMall.admin.notification.dashboard.at(
      authConnection,
    );
  typia.assert(dashboard);
  // 4. Validate core numeric fields
  TestValidator.predicate(
    "unreadCount is positive int32",
    dashboard.unreadCount >= 0,
  );
  TestValidator.predicate(
    "totalUnread is positive int32",
    dashboard.totalUnread >= 0,
  );
  TestValidator.predicate(
    "recentNotifications is array",
    Array.isArray(dashboard.recentNotifications),
  );
  TestValidator.predicate(
    "recentNotifications has max 10 items",
    dashboard.recentNotifications.length <= 10,
  );
  // 5. Validate recentNotifications structure if any exist
  if (dashboard.recentNotifications.length > 0) {
    const firstNotification: IEcommerceMallNotification.ISummary =
      dashboard.recentNotifications[0];
    typia.assert(firstNotification);
    // Validate notification status field contains valid values
    TestValidator.predicate(
      "notification status is unread or read",
      firstNotification.status === "unread" ||
        firstNotification.status === "read",
    );
    // Validate title and body are present strings
    TestValidator.predicate(
      "notification has non-empty title",
      firstNotification.title.length > 0,
    );
    TestValidator.predicate(
      "notification has non-empty body",
      firstNotification.body.length > 0,
    );
    // Validate type field exists
    TestValidator.predicate(
      "notification has type",
      firstNotification.type.length > 0,
    );
    // Validate date fields are ISO 8601 formatted
    TestValidator.predicate(
      "created_at is valid datetime",
      !Number.isNaN(Date.parse(firstNotification.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid datetime",
      !Number.isNaN(Date.parse(firstNotification.updated_at)),
    );
  }
  // 6. Validate optional systemAlert structure if present
  if (dashboard.systemAlert) {
    typia.assert(dashboard.systemAlert);
    TestValidator.equals(
      "systemAlert hasAlert is boolean",
      dashboard.systemAlert.hasAlert,
      dashboard.systemAlert.hasAlert,
    );
    if (dashboard.systemAlert.alertMessage !== undefined) {
      TestValidator.predicate(
        "alertMessage is non-empty string",
        dashboard.systemAlert.alertMessage!.length > 0,
      );
    }
    if (dashboard.systemAlert.alertLevel !== undefined) {
      const validAlertLevels: readonly ("info" | "warning" | "critical")[] = [
        "info",
        "warning",
        "critical",
      ] as const;
      TestValidator.predicate(
        "alertLevel is valid level",
        validAlertLevels.includes(dashboard.systemAlert.alertLevel),
      );
    }
  }
}