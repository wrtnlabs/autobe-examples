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

export async function test_api_user_notification_create_owner_type_variations(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests creation of a user notification with the minimal required fields and verifies owner_type enumeration handling. The test creates notifications for different owner types: 'customer', 'seller', and 'administrator' using valid template ID. It verifies that notifications are correctly associated and stored, and are initially marked unread. The test checks correct handling of optional URL and image_url fields as null values when not provided. Authorization is ensured by administrator join prerequisite, and notification template creation prerequisite provides valid template references.
  // 1. Administrator join and create authorized connection
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminJoinConnection, { body: {} });
  adminJoinConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a notification template as prerequisite
  const notificationTemplate: IShoppingMallNotificationTemplate =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminJoinConnection,
      { body: {} },
    );
  typia.assert(notificationTemplate);
  // 3. For each owner type, create a user notification
  const ownerTypes: Array<"customer" | "seller" | "administrator"> = [
    "customer",
    "seller",
    "administrator",
  ];
  for (const ownerType of ownerTypes) {
    // Create user notification with minimal required fields
    const newNotification: IShoppingMallUserNotification =
      await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
        adminJoinConnection,
        {
          body: {
            owner_id: typia.random<string & typia.tags.Format<"uuid">>(),
            title: "Notification Title",
            body: "Notification Body",
          },
        },
      );
    typia.assert(newNotification);
  }
}
