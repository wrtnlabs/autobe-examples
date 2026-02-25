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

export async function test_api_administrator_user_notification_creation_varied_owner_types(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test creation of user notification with different owner types: customer, seller, and administrator.
  // For each owner type, verify proper assignment of ownerType and ownerId. Validate authorization and content.
  // 1. Create and authorize an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: DeepPartial<IShoppingMallAdministrator.IJoin> = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
    password: "password123",
  };
  const admin: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  // 2. Define owner types to test
  const ownerTypes = ["customer", "seller", "administrator"] as const;
  // 3. Prepare create notification bodies per ownerType
  // We'll mock or randomly generate owner ID (UUID string) for testing
  // Since we have no specific customers/sellers API here, we generate random UUID strings as owners
  // 4. To get a notificationTemplateId to use, create a random user notification and extract its notificationTemplateId
  // We'll create a temp notification for admin, then use the template ID for all tests
  const tempNotification: IShoppingMallUserNotification =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {},
    );
  // Assert and get the template id
  typia.assert(tempNotification);
  const notificationTemplateId = tempNotification.notification_template_id;
  // 5. For each owner type, create notification, assert output
  await ArrayUtil.asyncForEach(ownerTypes, async (ownerType) => {
    const ownerId = typia.random<string & tags.Format<"uuid">>();
    const body: DeepPartial<IShoppingMallUserNotification.ICreate> = {
      notificationTemplateId,
      ownerId,
      ownerType,
      title: `Notification for ${ownerType}`,
      body: `This is a notification body for ${ownerType}`,
      isRead: false,
      url: null,
      imageUrl: null,
      deliveredAt: null,
      readAt: null,
      updatedAt: null,
      deletedAt: null,
    };
    const notification =
      await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
        adminConnection,
        { body },
      );
    typia.assert(notification);
    TestValidator.equals("ownerType match", notification.owner_type, ownerType);
    TestValidator.equals("ownerId match", notification.owner_id, ownerId);
    TestValidator.equals(
      "notificationTemplateId match",
      notification.notification_template_id,
      notificationTemplateId,
    );
    TestValidator.equals("title match", notification.title, body.title);
    TestValidator.equals("body match", notification.body, body.body);
    TestValidator.predicate("isRead false", notification.is_read === false);
  });
  // 6. Test authorization: Try creating notification with base connection (unauthorized) and expect an error
  await TestValidator.error("Unauthorized creation should fail", async () => {
    const body: DeepPartial<IShoppingMallUserNotification.ICreate> = {
      notificationTemplateId,
      ownerId: typia.random<string & tags.Format<"uuid">>(),
      ownerType: "customer",
      title: "Unauthorized notification",
      body: "Should not be created",
      isRead: false,
    };
    await api.functional.shoppingMall.administrator.userNotifications.createUserNotification(
      connection,
      { body: body as IShoppingMallUserNotification.ICreate },
    );
  });
}
