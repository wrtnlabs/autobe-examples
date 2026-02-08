import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_shopping_mall_administrator_notification_logs_create_notification_log } from "../../../generate/generate_random_shopping_mall_administrator_notification_logs_create_notification_log";

export async function test_api_notification_log_creation_system_event(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinPayload,
  });
  typia.assert(authorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;

  // 2. Create a notification log with event_type = 'system'
  const body: IShoppingMallNotificationLog.ICreate = {
    event_type: "system",
    event_metadata: JSON.stringify({ info: "System event log test" }),
    notification_template_id: null,
    user_notification_id: null,
  };

  const notificationLogRaw = await generate_random_shopping_mall_administrator_notification_logs_create_notification_log(
    adminConnection,
    { body },
  );

  typia.assert(notificationLogRaw);

  // Cast notificationLogRaw to full IShoppingMallNotificationLog to access properties
  const notificationLog = notificationLogRaw as unknown as IShoppingMallNotificationLog & {
    event_type: string;
    event_metadata: string;
    created_at: string;
    updated_at: string;
    id: string;
  };

  // 3. Validate important fields
  TestValidator.equals(
    "event_type is system",
    notificationLog.event_type,
    "system",
  );
  TestValidator.predicate(
    "event_metadata includes info",
    notificationLog.event_metadata.includes("System event log test"),
  );
  typia.assertGuard(notificationLog.created_at);
  typia.assertGuard(notificationLog.updated_at);
  // 4. Ensure ID exists and is UUID
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      notificationLog.id,
    ),
  );
}
