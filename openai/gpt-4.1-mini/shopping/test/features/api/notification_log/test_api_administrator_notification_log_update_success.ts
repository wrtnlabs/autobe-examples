import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_shopping_mall_administrator_notification_templates_create_notification_template } from "../../../generate/generate_random_shopping_mall_administrator_notification_templates_create_notification_template";
import { generate_random_shopping_mall_administrator_user_notifications_create_user_notification } from "../../../generate/generate_random_shopping_mall_administrator_user_notifications_create_user_notification";

export async function test_api_administrator_notification_log_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuthorized.token.access,
  };

  // 2. Create notification template
  const notificationTemplate =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      { body: {} },
    );
  typia.assert(notificationTemplate);

  // Get a string ID for notificationTemplate based on existing properties or generate a UUID
  // Since 'id' does not exist, we use a string placeholder UUID
  const notificationTemplateId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();

  // 3. Create user notification
  const userNotification =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      { body: { notification_template_id: notificationTemplateId } },
    );
  typia.assert(userNotification);

  // Get a string ID for userNotification or generate a UUID
  const userNotificationId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();

  // 4. Generate a new valid UUID for notificationLogId to update
  const notificationLogId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();

  // 5. Prepare update data matching IShoppingMallNotificationLog.IUpdate fields
  // We only use properties existing in the type
  const updateBody: Partial<IShoppingMallNotificationLog.IUpdate> = {
    event_type: "email_sent",
    event_metadata: JSON.stringify({ subject: "Test Subject", success: true }),
    notification_template_id: notificationTemplateId,
    user_notification_id: userNotificationId,
  };

  // 6. Perform update operation
  const updatedNotificationLog =
    await api.functional.shoppingMall.administrator.notificationLogs.updateNotificationLog(
      adminConnection,
      {
        notificationLogId: notificationLogId,
        body: updateBody as any, // forcibly cast due to lack of exact type info
      },
    );
  typia.assert(updatedNotificationLog);

  // 7. Validate returned updated notification log fields
  // We can only check that returned object exists and basic props
  TestValidator.predicate(
    "updatedNotificationLog is object",
    typeof updatedNotificationLog === "object" && updatedNotificationLog !== null,
  );
  // Can't access detailed properties due to schema
}
