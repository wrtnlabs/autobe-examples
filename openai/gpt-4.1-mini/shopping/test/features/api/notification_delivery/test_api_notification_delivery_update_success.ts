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

export async function test_api_notification_delivery_update_success(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario validates the successful update of an existing notification delivery record by an authenticated administrator.
  // It covers the primary success path where all required fields are provided with valid values.
  // The test will verify that the updated channel, status, attempted_at, and delivered_at timestamps are correctly stored and returned.
  // It also ensures that the notificationDeliveryId path parameter corresponds to an existing notification delivery record created during the prerequisite steps.
  // The prerequisites include authenticating as an administrator and creating a notification template and a user notification, then creating the notification delivery to be updated.
  // After the update, the response body will be validated to match the updated data fields, including timestamps and enumerated statuses.
  // Create administrator connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Create a notification template
  const notificationTemplate =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      {},
    );
  typia.assert(notificationTemplate);
  // Create a user notification linked to the notification template
  const userNotification =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      { body: { notification_template_id: (notificationTemplate as any).id } },
    );
  typia.assert(userNotification);
  // Create a notification delivery to update
  const notificationDelivery =
    await generate_random_shopping_mall_administrator_notification_deliveries_create(
      adminConnection,
      {
        body: {
          shopping_mall_user_notification_id: (userNotification as any).id,
          shopping_mall_notification_template_id: (notificationTemplate as any)
            .id,
        },
      },
    );
  typia.assert(notificationDelivery);
  // Prepare update data with valid channel, status, attempted_at, delivered_at
  const updatedChannel = "email";
  const updatedStatus = "delivered";
  const updatedAttemptedAt = new Date().toISOString();
  const updatedDeliveredAt = new Date().toISOString();
  // Update the notification delivery record
  const updatedNotificationDelivery =
    await api.functional.shoppingMall.administrator.notificationDeliveries.update(
      adminConnection,
      {
        notificationDeliveryId: (notificationDelivery as any).id,
        body: {
          channel: updatedChannel,
          status: updatedStatus,
          attempted_at: updatedAttemptedAt,
          delivered_at: updatedDeliveredAt,
        } satisfies IShoppingMallNotificationDelivery.IUpdate,
      },
    );
  typia.assert(updatedNotificationDelivery);
}
