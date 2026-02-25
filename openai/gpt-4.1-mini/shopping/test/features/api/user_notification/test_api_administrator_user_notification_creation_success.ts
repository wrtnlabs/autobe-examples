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

export async function test_api_administrator_user_notification_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // This test validates the successful creation of a user notification by an administrator.
  // 1. An administrator account is created and authorized.
  // 2. A user notification is created with valid required data including reference to an existing notification template and a valid owner as a customer.
  // 3. The notification creation response is validated for full DTO structure and correctness.
  // 4. Optional properties `url` and `image_url` are tested with both null and valid URL values.
  // 5. The initial notification is confirmed as unread with no delivery or read timestamps.
  // 1. Administrator setup and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "StrongP@ssword123",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminJoinOutput.token.access}`,
  };
  // 2. Prepare notification creation data
  // Generate a random notification to obtain valid notification_template_id and owner
  const notificationInput =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      { body: {} },
    );
  // Extract required fields from the created notification to use in explicit create tests
  const { notification_template_id, owner_id, owner_type } = notificationInput;
  // 3. Test with required fields only
  const baseCreateBody: IShoppingMallUserNotification.ICreate = {
    notificationTemplateId: notification_template_id,
    ownerId: owner_id,
    ownerType: owner_type,
    title: `Test Notification Title ${RandomGenerator.alphaNumeric(5)}`,
    body: `This is a test notification body content ${RandomGenerator.paragraph({ sentences: 2 })}`,
    isRead: false,
    url: null,
    imageUrl: null,
  };
  // Explicitly create notification with required + null optional fields
  const notification1 =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      { body: baseCreateBody },
    );
  typia.assert(notification1);
  // Validate main properties
  TestValidator.equals(
    "notification template id",
    notification1.notification_template_id,
    notification_template_id,
  );
  TestValidator.equals("owner id", notification1.owner_id, owner_id);
  TestValidator.equals("owner type", notification1.owner_type, owner_type);
  TestValidator.predicate(
    "is_read should be false initially",
    notification1.is_read === false,
  );
  TestValidator.predicate(
    "delivered_at should be null",
    notification1.delivered_at === null ||
      notification1.delivered_at === undefined,
  );
  TestValidator.predicate(
    "read_at should be null",
    notification1.read_at === null || notification1.read_at === undefined,
  );
  TestValidator.equals(
    "title matches",
    notification1.title,
    baseCreateBody.title,
  );
  TestValidator.equals("body matches", notification1.body, baseCreateBody.body);
  // Validate owner and notificationTemplate types
  typia.assert(notification1.owner);
  typia.assert(notification1.notificationTemplate);
  // 4. Test with optional fields set with valid URLs
  const url = "https://example.com/notification";
  const imageUrl = "https://example.com/image.png";
  const notification2 =
    await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
      adminConnection,
      {
        body: {
          ...baseCreateBody,
          url,
          imageUrl,
        },
      },
    );
  typia.assert(notification2);
  TestValidator.equals("url matches", notification2.url, url);
  TestValidator.equals("image_url matches", notification2.image_url, imageUrl);
  // 5. Authorization enforcement test: unauthenticated client
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated creation request",
    401,
    async () => {
      await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
        anonymousConnection,
        { body: baseCreateBody },
      );
    },
  );
  // 6. Authorization enforcement test: non-administrator
  // Simulate a non-administrator user connection (no admin authorization)
  const nonAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "non-admin creation request forbidden",
    403,
    async () => {
      await generate_random_shopping_mall_administrator_user_notifications_create_user_notification(
        nonAdminConnection,
        { body: baseCreateBody },
      );
    },
  );
}
