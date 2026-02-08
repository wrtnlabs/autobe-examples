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

export async function test_api_administrator_user_notification_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a notification template as prerequisite
  const notificationTemplate =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      { body: {} },
    );
  typia.assert(notificationTemplate);
  const notificationTemplateEntity = notificationTemplate as IEntity;
  // 3. Create a user notification to have valid data linkage but not used in update
  const userNotification =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {
        body: {
          notification_template_id: notificationTemplateEntity.id,
          owner_id: typia.random<string & tags.Format<"uuid">>(),
          owner_type: "administrator",
          title: "Initial Notification",
          body: "This is a test notification.",
          url: null,
          image_url: null,
          is_read: false,
          delivered_at: null,
          read_at: null,
        },
      },
    );
  typia.assert(userNotification);
  const userNotificationEntity = userNotification as IEntity;
  // 4. Prepare an updating body
  const updateBody: IShoppingMallUserNotification.IUpdate = {
    title: "Updated Title",
    body: "Updated body content",
    url: null,
    image_url: null,
    is_read: true,
    delivered_at: new Date().toISOString(),
    read_at: new Date().toISOString(),
  };
  // 5. Attempt to update a non-existent user notification id
  let nonExistentId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentId === userNotificationEntity.id) {
    const lastChar = nonExistentId.slice(-1);
    const flippedChar = lastChar === "0" ? "1" : "0";
    nonExistentId = nonExistentId.slice(0, -1) + flippedChar;
  }
  await TestValidator.httpError(
    "update non-existent notification returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.updateUserNotification(
        adminConnection,
        {
          userNotificationId: nonExistentId,
          body: updateBody,
        },
      );
    },
  );
}
