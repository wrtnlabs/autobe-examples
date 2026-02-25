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

export async function test_api_user_notification_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "StrongPass1234",
    },
  });
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Create a user notification to update
  const createdNotification =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      { body: {} },
    );
  typia.assert(createdNotification);
  // 3. Prepare update data for mutable fields
  const updateBody: IShoppingMallUserNotification.IUpdate = {
    title: RandomGenerator.name(3),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: "https://example.com/updated-url",
    imageUrl: "https://example.com/updated-image.jpg",
    isRead: !createdNotification.is_read,
    deliveredAt: createdNotification.delivered_at
      ? new Date(
          new Date(createdNotification.delivered_at).getTime() + 60000,
        ).toISOString()
      : new Date().toISOString(),
    readAt: createdNotification.read_at
      ? new Date(
          new Date(createdNotification.read_at).getTime() + 60000,
        ).toISOString()
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // 4. Perform update
  const updatedNotification =
    await api.functional.shoppingMall.administrator.userNotifications.update(
      adminConnection,
      {
        notificationId: createdNotification.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);
  // 5. Validate mutable fields updated correctly
  TestValidator.equals(
    "title updated",
    updatedNotification.title,
    updateBody.title,
  );
  TestValidator.equals(
    "body updated",
    updatedNotification.body,
    updateBody.body,
  );
  TestValidator.equals(
    "url updated",
    updatedNotification.url ?? null,
    updateBody.url ?? null,
  );
  TestValidator.equals(
    "imageUrl updated",
    updatedNotification.image_url ?? null,
    updateBody.imageUrl ?? null,
  );
  TestValidator.equals(
    "isRead updated",
    updatedNotification.is_read,
    updateBody.isRead,
  );
  TestValidator.equals(
    "deliveredAt updated",
    updatedNotification.delivered_at ?? null,
    updateBody.deliveredAt ?? null,
  );
  TestValidator.equals(
    "readAt updated",
    updatedNotification.read_at ?? null,
    updateBody.readAt ?? null,
  );
  // 6. Validate immutable fields remain unchanged
  TestValidator.equals(
    "id unchanged",
    updatedNotification.id,
    createdNotification.id,
  );
  TestValidator.equals(
    "notificationTemplateId unchanged",
    updatedNotification.notification_template_id,
    createdNotification.notification_template_id,
  );
  TestValidator.equals(
    "ownerId unchanged",
    updatedNotification.owner_id,
    createdNotification.owner_id,
  );
  TestValidator.equals(
    "ownerType unchanged",
    updatedNotification.owner_type,
    createdNotification.owner_type,
  );
  TestValidator.equals(
    "owner unchanged",
    updatedNotification.owner,
    createdNotification.owner,
  );
  TestValidator.equals(
    "notificationTemplate unchanged",
    updatedNotification.notificationTemplate,
    createdNotification.notificationTemplate,
  );
  // 7. Validate updatedAt is newer or equal to input updatedAt (system auto-update)
  TestValidator.predicate(
    "updatedAt auto-updated",
    new Date(updatedNotification.updated_at).getTime() >=
      new Date(updateBody.updatedAt).getTime(),
  );
  // 8. Test error handling for non-existent notificationId
  await TestValidator.httpError(
    "update non-existent notification",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.update(
        adminConnection,
        {
          notificationId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
  // 9. Test authorization enforcement: attempt update with unauthorized connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update attempt",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.update(
        unauthorizedConnection,
        {
          notificationId: createdNotification.id,
          body: updateBody,
        },
      );
    },
  );
}
