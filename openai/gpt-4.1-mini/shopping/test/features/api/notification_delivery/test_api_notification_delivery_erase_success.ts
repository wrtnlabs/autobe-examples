import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
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
import { generate_random_shopping_mall_administrator_notification_deliveries_create } from "../../../generate/generate_random_shopping_mall_administrator_notification_deliveries_create";
import { generate_random_shopping_mall_administrator_notification_templates_create_notification_template } from "../../../generate/generate_random_shopping_mall_administrator_notification_templates_create_notification_template";
import { generate_random_shopping_mall_administrator_user_notifications_create_user_notification } from "../../../generate/generate_random_shopping_mall_administrator_user_notifications_create_user_notification";
import { prepare_random_shopping_mall_notification_delivery } from "../../../prepare/prepare_random_shopping_mall_notification_delivery";
import { prepare_random_shopping_mall_notification_template } from "../../../prepare/prepare_random_shopping_mall_notification_template";
import { prepare_random_shopping_mall_user_notification } from "../../../prepare/prepare_random_shopping_mall_user_notification";

export async function test_api_notification_delivery_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the deletion of an existing notification delivery record by an authorized administrator.
  // 1. Admin joins the platform and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Create a notification template
  const templateRaw =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      { body: {} },
    );
  const template = typia.assert<IShoppingMallNotificationTemplate & IEntity>(templateRaw);
  // 3. Create a user notification referencing the template
  const userNotificationRaw =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {
        body: {
          notification_template_id: template.id,
          owner_id: typia.random<string & tags.Format<"uuid">>(),
          owner_type: "customer",
          title: "Test Notification",
          body: "This is a test notification.",
          url: null,
          image_url: null,
          is_read: false,
          delivered_at: null,
          read_at: null,
        },
      },
    );
  const userNotification = typia.assert<IShoppingMallUserNotification & IEntity>(userNotificationRaw);
  // 4. Create a notification delivery for the user notification
  const notificationDeliveryRaw =
    await generate_random_shopping_mall_administrator_notification_deliveries_create(
      adminConnection,
      {
        body: {
          shopping_mall_user_notification_id: userNotification.id,
          shopping_mall_notification_template_id: template.id,
          channel: "email",
          status: "delivered",
          attempted_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          deleted_at: null,
        },
      },
    );
  const notificationDelivery = typia.assert<IShoppingMallNotificationDelivery & IEntity>(notificationDeliveryRaw);
  // 5. Delete the notification delivery identified by its ID
  await api.functional.shoppingMall.administrator.notificationDeliveries.erase(
    adminConnection,
    {
      notificationDeliveryId: notificationDelivery.id,
    },
  );
  // 6. Confirm that the notification delivery no longer exists by attempting to delete again, expecting an error
  await TestValidator.error(
    "notification delivery deletion of already deleted record",
    async () => {
      await api.functional.shoppingMall.administrator.notificationDeliveries.erase(
        adminConnection,
        {
          notificationDeliveryId: notificationDelivery.id,
        },
      );
    },
  );
}
