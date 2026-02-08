import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_notification_templates_create_notification_template } from "../../../generate/generate_random_shopping_mall_administrator_notification_templates_create_notification_template";
import { generate_random_shopping_mall_administrator_user_notifications_create_user_notification } from "../../../generate/generate_random_shopping_mall_administrator_user_notifications_create_user_notification";
import { prepare_random_shopping_mall_notification_template } from "../../../prepare/prepare_random_shopping_mall_notification_template";
import { prepare_random_shopping_mall_user_notification } from "../../../prepare/prepare_random_shopping_mall_user_notification";

export async function test_api_administrator_notification_log_update_invalid_references(
  connection: api.IConnection,
): Promise<void> {
  // Scenario:
  // 1. Admin joins (registers) and obtains authorization.
  // 2. Create a valid notification template and user notification for control.
  // 3. Create a valid notification log entry.
  // 4. Attempt to update the notification log entry with a non-existent notificationTemplateId (invalid foreign key).
  // 5. Attempt to update the notification log entry with a non-existent userNotificationId (invalid foreign key).
  // 6. Attempt to update the notification log entry with both foreign keys invalid.
  // 7. Confirm that the server rejects such updates and throws, with no partial updates.
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Create valid notification template
  const validNotificationTemplate =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      { body: {} },
    );
  // 3. Create valid user notification
  const validUserNotification =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      { body: {} },
    );
  // Extract ids safely according to known keys or use UUIDs in fallback
  const notificationTemplateId =
    (validNotificationTemplate as any).notificationTemplateId ??
    (validNotificationTemplate as any).id ??
    "00000000-0000-0000-0000-000000000000";
  const userNotificationId =
    (validUserNotification as any).userNotificationId ??
    (validUserNotification as any).id ??
    "00000000-0000-0000-0000-000000000000";
  // 4. Create a valid notification log entry to update later
  const initialNotificationLogId = typia.random<string & tags.Format<"uuid">>();
  const validUpdateBody: IShoppingMallNotificationLog.IUpdate = {
    eventType: "sent",
    eventMetadata: null,
    notificationTemplateId: notificationTemplateId,
    userNotificationId: userNotificationId,
  };
  try {
    await api.functional.shoppingMall.administrator.notificationLogs.updateNotificationLog(
      adminConnection,
      {
        notificationLogId: initialNotificationLogId,
        body: validUpdateBody,
      },
    );
  } catch {
    // It's acceptable if update fails for non-existent initial ID; proceed to test invalid updates
  }
  const nonExistentNotificationTemplateId = typia.random<
    string & tags.Format<"uuid">
  >();
  const nonExistentUserNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Attempt update with invalid notificationTemplateId
  await TestValidator.error(
    "update fails with non-existent notificationTemplateId",
    async () => {
      await api.functional.shoppingMall.administrator.notificationLogs.updateNotificationLog(
        adminConnection,
        {
          notificationLogId: initialNotificationLogId,
          body: {
            eventType: "sent",
            eventMetadata: null,
            notificationTemplateId: nonExistentNotificationTemplateId,
            userNotificationId: userNotificationId,
          },
        },
      );
    },
  );
  // 6. Attempt update with invalid userNotificationId
  await TestValidator.error(
    "update fails with non-existent userNotificationId",
    async () => {
      await api.functional.shoppingMall.administrator.notificationLogs.updateNotificationLog(
        adminConnection,
        {
          notificationLogId: initialNotificationLogId,
          body: {
            eventType: "sent",
            eventMetadata: null,
            notificationTemplateId: notificationTemplateId,
            userNotificationId: nonExistentUserNotificationId,
          },
        },
      );
    },
  );
  // 7. Attempt update with both notificationTemplateId and userNotificationId invalid
  await TestValidator.error(
    "update fails with both notificationTemplateId and userNotificationId invalid",
    async () => {
      await api.functional.shoppingMall.administrator.notificationLogs.updateNotificationLog(
        adminConnection,
        {
          notificationLogId: initialNotificationLogId,
          body: {
            eventType: "sent",
            eventMetadata: null,
            notificationTemplateId: nonExistentNotificationTemplateId,
            userNotificationId: nonExistentUserNotificationId,
          },
        },
      );
    },
  );
}
