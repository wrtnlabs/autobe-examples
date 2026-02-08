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

export async function test_api_administrator_user_notification_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin actor connection for creating dependencies
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator registration - we need an account to create resources
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(5)}@mail.com`,
      password: "P@ssw0rd1234",
      name: `Admin ${RandomGenerator.name()}`,
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a notification template dependency
  const notificationTemplate =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      {
        body: {
          template_code: `TPL_${RandomGenerator.alphabets(5).toUpperCase()}`,
          template_name: `Template ${RandomGenerator.name()}`,
          content: `Content ${RandomGenerator.paragraph({ sentences: 1 })}`,
          parameters: JSON.stringify({ user: "string" }),
        } satisfies IShoppingMallNotificationTemplate.ICreate,
      },
    );
  typia.assert(notificationTemplate);
  // 3. Create a user notification without referencing non-existent id or template_code
  const userNotification =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {
        body: {
          // Do not use notification_template_code as it does not exist on IShoppingMallUserNotification.ICreate
          owner_id: adminAuthorized.token.access,
          owner_type: "administrator",
          title: `Title ${RandomGenerator.paragraph({ sentences: 1 })}`,
          body: `Body ${RandomGenerator.paragraph({ sentences: 2 })}`,
          url: null,
          image_url: null,
          is_read: false,
          delivered_at: null,
          read_at: null,
        } satisfies IShoppingMallUserNotification.ICreate,
      },
    );
  typia.assert(userNotification);
  // 4. Attempt to update user notification without admin auth connection
  // Use base connection without Authorization header
  const updateBody: IShoppingMallUserNotification.IUpdate = {
    title: `Updated Title ${RandomGenerator.paragraph({ sentences: 1 })}`,
    body: `Updated Body ${RandomGenerator.paragraph({ sentences: 2 })}`,
    url: null,
    image_url: null,
    is_read: true,
    delivered_at: new Date().toISOString(),
    read_at: new Date().toISOString(),
  };
  await TestValidator.httpError(
    "unauthorized update user notification should return 403",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.updateUserNotification(
        connection,
        {
          userNotificationId: "",
          body: updateBody,
        },
      );
    },
  );
}
