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

export async function test_api_shoppingmall_administrator_notification_delivery_create_success_and_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {},
    });
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  // Create a notification template
  const notificationTemplateRaw =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      {},
    );
  // Cast notificationTemplateRaw to & { id: string }
  const notificationTemplate = typia.assert(
    notificationTemplateRaw as IShoppingMallNotificationTemplate & { id: string },
  );
  // Create a user notification using the created template
  const userNotificationRaw =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {
        body: {
          notification_template_id: notificationTemplate.id,
          owner_id: typia.random<string & tags.Format<"uuid">>(),
          owner_type: "administrator",
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
  const userNotification = typia.assert(
    userNotificationRaw as IShoppingMallUserNotification & { id: string },
  );
  // Test Scenario 1: Create notification delivery with 'delivered' status
  const now1 = new Date();
  const delivery1Raw =
    await generate_random_shopping_mall_administrator_notification_deliveries_create(
      adminConnection,
      {
        body: {
          shopping_mall_user_notification_id: userNotification.id,
          shopping_mall_notification_template_id: notificationTemplate.id,
          channel: "email",
          status: "delivered",
          attempted_at: now1.toISOString(),
          delivered_at: now1.toISOString(),
        },
      },
    );
  // Cast delivery1Raw to an extended interface to include all properties
  const delivery1 = typia.assert(
    delivery1Raw as IShoppingMallNotificationDelivery & {
      status: "delivered" | "pending";
      shopping_mall_user_notification_id: string;
      shopping_mall_notification_template_id: string;
      attempted_at: string;
      delivered_at: string | null;
    },
  );
  TestValidator.equals("delivery1 status", delivery1.status, "delivered");
  TestValidator.equals(
    "delivery1 user notification id",
    delivery1.shopping_mall_user_notification_id,
    userNotification.id,
  );
  TestValidator.equals(
    "delivery1 notification template id",
    delivery1.shopping_mall_notification_template_id,
    notificationTemplate.id,
  );
  TestValidator.equals(
    "delivery1 attempted_at",
    delivery1.attempted_at,
    now1.toISOString(),
  );
  TestValidator.equals(
    "delivery1 delivered_at",
    delivery1.delivered_at,
    now1.toISOString(),
  );
  // Test Scenario 2: Create notification delivery with 'pending' status and null delivered_at
  const now2 = new Date();
  const delivery2Raw =
    await generate_random_shopping_mall_administrator_notification_deliveries_create(
      adminConnection,
      {
        body: {
          shopping_mall_user_notification_id: userNotification.id,
          shopping_mall_notification_template_id: notificationTemplate.id,
          channel: "push",
          status: "pending",
          attempted_at: now2.toISOString(),
          delivered_at: null,
        },
      },
    );
  const delivery2 = typia.assert(
    delivery2Raw as IShoppingMallNotificationDelivery & {
      status: "delivered" | "pending";
      shopping_mall_user_notification_id: string;
      shopping_mall_notification_template_id: string;
      attempted_at: string;
      delivered_at: string | null;
    },
  );
  TestValidator.equals("delivery2 status", delivery2.status, "pending");
  TestValidator.equals(
    "delivery2 user notification id",
    delivery2.shopping_mall_user_notification_id,
    userNotification.id,
  );
  TestValidator.equals(
    "delivery2 notification template id",
    delivery2.shopping_mall_notification_template_id,
    notificationTemplate.id,
  );
  TestValidator.equals(
    "delivery2 attempted_at",
    delivery2.attempted_at,
    now2.toISOString(),
  );
  TestValidator.predicate(
    "delivery2 delivered_at is null",
    delivery2.delivered_at === null,
  );
}
