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

export async function test_api_notification_delivery_update_status_variations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });

  // 2. Create a notification template
  const notificationTemplateRaw =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      {},
    );
  const notificationTemplate = typia.assert<IShoppingMallNotificationTemplate & { id: string }>(notificationTemplateRaw);

  // 3. Create a user notification linked to the notification template
  const userNotificationRaw =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      { body: { notification_template_id: notificationTemplate.id } },
    );
  const userNotification = typia.assert<IShoppingMallUserNotification & { id: string }>(userNotificationRaw);

  // 4. Create a notification delivery to update
  const notificationDeliveryRaw =
    await generate_random_shopping_mall_administrator_notification_deliveries_create(
      adminConnection,
      {
        body: {
          user_notification_id: userNotification.id,
          shopping_mall_notification_template_id: notificationTemplate.id,
          channel: "email",
          status: "pending",
          attempted_at: new Date().toISOString(),
          delivered_at: null,
        },
      },
    );
  const notificationDelivery = typia.assert<IShoppingMallNotificationDelivery & { id: string }>(notificationDeliveryRaw);

  // 5. Define valid statuses and channels for update testing
  const statuses: ("delivered" | "failed" | "pending")[] = [
    "delivered",
    "failed",
    "pending",
  ];
  const channels: ("email" | "sms" | "push")[] = ["email", "sms", "push"];

  type UpdateBody = {
    channel: "email" | "sms" | "push";
    status: "delivered" | "failed" | "pending";
    attempted_at: string;
    delivered_at: string | null;
  };

  // 6. Cycle through each status and channel to perform update and check correctness
  for (const status of statuses) {
    for (const channel of channels) {
      const now = new Date().toISOString();
      // Prepare update body
      const body: UpdateBody = {
        channel,
        status,
        attempted_at: now,
        delivered_at: status === "delivered" ? now : null,
      };

      // Perform the update
      const updatedRaw =
        await api.functional.shoppingMall.administrator.notificationDeliveries.update(
          adminConnection,
          {
            notificationDeliveryId: notificationDelivery.id,
            body,
          },
        );
      const updated = typia.assert<
        IShoppingMallNotificationDelivery & {
          channel: string;
          status: string;
          attempted_at: string;
          delivered_at: string | null;
          updated_at: string;
        }
      >(updatedRaw);

      // Validate that updated fields match input
      TestValidator.equals(
        "channel update correctness",
        updated.channel,
        body.channel,
      );
      TestValidator.equals(
        "status update correctness",
        updated.status,
        body.status,
      );
      TestValidator.equals(
        "attempted_at update correctness",
        updated.attempted_at,
        body.attempted_at,
      );
      TestValidator.equals(
        "delivered_at update correctness",
        updated.delivered_at,
        body.delivered_at,
      );

      // Verify the updated_at is recent (within last 10 seconds)
      {
        const updatedAt = new Date(updated.updated_at).getTime();
        const nowTime = new Date().getTime();
        TestValidator.predicate(
          "updated_at recent",
          nowTime - updatedAt < 10000 && updatedAt <= nowTime,
        );
      }
    }
  }
}
