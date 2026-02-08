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

export async function test_api_notification_delivery_update_timestamps_handling(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Verifies update behavior of notification delivery timestamps and status.
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Step 2: Create a notification template
  const templateRaw =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      { body: {} },
    );
  typia.assert(templateRaw);
  // We must widen type manually to include `id` to use below
  const template = templateRaw as {
    id: string;
  } & object;
  // Step 3: Create a user notification linked to the template
  const userNotificationRaw =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {
        body: {
          notification_template_id: template.id,
          owner_id: typia.random<string & tags.Format<"uuid">>(),
          owner_type: "administrator",
          title: "Test Notification",
          body: "This is test notification body.",
          url: null,
          image_url: null,
          delivered_at: null,
          read_at: null,
          is_read: false,
        },
      },
    );
  typia.assert(userNotificationRaw);
  // Widening type to include `id` for usage
  const userNotification = userNotificationRaw as {
    id: string;
  } & object;
  // Step 4: Create a notification delivery
  const deliveryRaw =
    await generate_random_shopping_mall_administrator_notification_deliveries_create(
      adminConnection,
      {
        body: {
          shopping_mall_user_notification_id: userNotification.id,
          shopping_mall_notification_template_id: template.id,
          channel: "email",
          status: "pending",
          attempted_at: new Date().toISOString(),
          delivered_at: null,
          deleted_at: null,
        },
      },
    );
  typia.assert(deliveryRaw);
  // Widening type to include `id` for usage
  const delivery = deliveryRaw as {
    id: string;
  } & object;
  // Step 5: Update delivery with attempted_at and delivered_at timestamps where delivered_at is null (not yet delivered)
  const newAttemptedAt1 = new Date(Date.now() + 1000 * 60).toISOString();
  const partialUpdate1 = {
    attempted_at: newAttemptedAt1,
    delivered_at: null,
  };
  const updated1 =
    await api.functional.shoppingMall.administrator.notificationDeliveries.update(
      adminConnection,
      {
        notificationDeliveryId: delivery.id,
        body: partialUpdate1,
      },
    );
  typia.assert(updated1);
  // Validate updated timestamps
  TestValidator.equals(
    "attempted_at updated",
    (updated1 as any).attempted_at,
    partialUpdate1.attempted_at,
  );
  TestValidator.equals(
    "delivered_at remains null",
    (updated1 as any).delivered_at,
    null,
  );
  // Step 6: Update delivery with changing delivery channel and status, still with delivered_at null.
  const partialUpdate2 = {
    channel: "push",
    status: "failed",
    delivered_at: null,
  };
  const updated2 =
    await api.functional.shoppingMall.administrator.notificationDeliveries.update(
      adminConnection,
      {
        notificationDeliveryId: delivery.id,
        body: partialUpdate2,
      },
    );
  typia.assert(updated2);
  // Validate that channel and status changed correctly
  TestValidator.equals(
    "channel updated",
    (updated2 as any).channel,
    partialUpdate2.channel,
  );
  TestValidator.equals(
    "status updated",
    (updated2 as any).status,
    partialUpdate2.status,
  );
  TestValidator.equals(
    "delivered_at remains null after channel/status update",
    (updated2 as any).delivered_at,
    null,
  );
  // Step 7: Update delivery with delivered_at timestamp indicating successful delivery
  const deliveredAtDate = new Date(Date.now() + 1000 * 120).toISOString();
  const partialUpdate3 = {
    delivered_at: deliveredAtDate,
    status: "delivered",
  };
  const updated3 =
    await api.functional.shoppingMall.administrator.notificationDeliveries.update(
      adminConnection,
      {
        notificationDeliveryId: delivery.id,
        body: partialUpdate3,
      },
    );
  typia.assert(updated3);
  // Validate final delivered_at and status
  TestValidator.equals(
    "delivered_at updated",
    (updated3 as any).delivered_at,
    partialUpdate3.delivered_at,
  );
  TestValidator.equals(
    "status updated to delivered",
    (updated3 as any).status,
    partialUpdate3.status,
  );
}
