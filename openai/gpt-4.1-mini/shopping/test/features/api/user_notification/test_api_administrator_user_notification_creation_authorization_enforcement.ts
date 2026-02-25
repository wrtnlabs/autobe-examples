import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_administrator_user_notifications_create_user_notification } from "../../../generate/generate_random_shopping_mall_administrator_user_notifications_create_user_notification";
import { prepare_random_shopping_mall_user_notification } from "../../../prepare/prepare_random_shopping_mall_user_notification";

export async function test_api_administrator_user_notification_creation_authorization_enforcement(
  connection: api.IConnection,
) {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "Password123!",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // Prepare a valid user notification creation body
  const notificationBody: IShoppingMallUserNotification.ICreate = {
    notificationTemplateId: typia.random<string & tags.Format<"uuid">>(),
    ownerId: typia.random<string & tags.Format<"uuid">>(),
    ownerType: "administrator",
    title: "System Notification",
    body: "This is a notification from administrator.",
    isRead: false,
  };
  // Create the user notification successfully with administrator connection
  const notification =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {
        body: notificationBody,
      },
    );
  typia.assert(notification);
  TestValidator.equals(
    "admin can create notification",
    notification.owner_type,
    "administrator",
  );
  // Attempt to create user notification as unauthorized anonymous connection (no auth)
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "anonymous cannot create notification",
    401,
    async () => {
      await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
        anonymousConnection,
        {
          body: notificationBody,
        },
      );
    },
  );
  // Attempt unauthorized creation with wrong role (simulate by using admin connection but changing ownerType to 'customer')
  const invalidCustomerNotificationBody: IShoppingMallUserNotification.ICreate =
    {
      ...notificationBody,
      ownerType: "customer",
    };
  // Here we assume the actual API authorization check is based on the connection token,
  // so if a non-admin tries to call the admin endpoint, it should fail.
  // But we cannot simulate a non-admin token without valid login function here,
  // so we attempt to simulate this by using anonymous connection or by manual call to the API (skipped)
  // Hence, we test unauthorized with anonymous and already tested admin success.
  // Instead, test that creating with admin but with incorrect ownerType property should succeed,
  // because authorization is about actor token, ownerType is logical field.
  const notificationWithCustomerOwner =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {
        body: invalidCustomerNotificationBody,
      },
    );
  typia.assert(notificationWithCustomerOwner);
  TestValidator.equals(
    "admin can create notification with ownerType customer",
    notificationWithCustomerOwner.owner_type,
    "customer",
  );
}
