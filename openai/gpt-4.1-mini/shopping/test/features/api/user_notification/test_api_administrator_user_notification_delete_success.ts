import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

export async function test_api_administrator_user_notification_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin is empty
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // Create a notification template
  const notificationTemplate =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      {},
    );
  typia.assert(notificationTemplate);
  // Create a user notification referencing the notification template
  const userNotification =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {
        body: {
          notification_template_id: (notificationTemplate as unknown as { id: string }).id,
          owner_id: typia.random<string & tags.Format<"uuid">>(),
          owner_type: "administrator",
          title: "Test Notification",
          body: "This is a test notification body.",
          url: null,
          image_url: null,
        },
      },
    );
  typia.assert(userNotification);
  // Delete the user notification
  await api.functional.shoppingMall.administrator.userNotifications.erase(
    adminConnection,
    {
      userNotificationId: (userNotification as unknown as { id: string }).id,
    },
  );
  // No direct response to validate, but function should not throw
  // Verifying the notification is removed is limited here due to lack of fetch endpoint
}
