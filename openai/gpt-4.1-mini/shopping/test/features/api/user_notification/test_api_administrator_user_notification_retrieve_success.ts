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

export async function test_api_administrator_user_notification_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a test user notification for the admin (simulate creation since no utility)
  // Since direct creation utility is not given, use the simulate random data
  const notification = typia.random<IShoppingMallUserNotification>();
  // Ensure the notification owner is the authenticated admin
  // Override polymorphic owner fields accordingly
  Object.assign(notification.owner, {
    id: admin.id,
    email: admin.email,
    displayName: null,
    phoneNumber: null,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  });
  notification.owner_id = admin.id;
  notification.owner_type = "administrator";
  // Override deleted_at to be null (active notification)
  notification.deleted_at = null;
  // 3. Attempt to retrieve the notification by id
  const fetched =
    await api.functional.shoppingMall.administrator.userNotifications.at(
      adminConnection,
      {
        notificationId: notification.id,
      },
    );
  // Assert exact type
  typia.assert(fetched);
  // 4. Validate all required fields
  TestValidator.equals("notification id", fetched.id, notification.id);
  TestValidator.equals("notification title", fetched.title, notification.title);
  TestValidator.equals("notification body", fetched.body, notification.body);
  // URL and image_url can be null or string or undefined
  TestValidator.predicate(
    "notification url type",
    fetched.url === null ||
      typeof fetched.url === "string" ||
      fetched.url === undefined,
  );
  TestValidator.predicate(
    "notification image_url type",
    fetched.image_url === null ||
      typeof fetched.image_url === "string" ||
      fetched.image_url === undefined,
  );
  TestValidator.equals("is_read flag", fetched.is_read, notification.is_read);
  // Timestamps
  TestValidator.equals(
    "created_at",
    new Date(fetched.created_at).toISOString(),
    new Date(notification.created_at).toISOString(),
  );
  TestValidator.equals(
    "updated_at",
    new Date(fetched.updated_at).toISOString(),
    new Date(notification.updated_at).toISOString(),
  );
  // Optional timestamps - delivered_at and read_at
  if (fetched.delivered_at !== null && fetched.delivered_at !== undefined) {
    TestValidator.predicate(
      "delivered_at is ISO string",
      !isNaN(Date.parse(fetched.delivered_at)) &&
        typeof fetched.delivered_at === "string",
    );
  }
  if (fetched.read_at !== null && fetched.read_at !== undefined) {
    TestValidator.predicate(
      "read_at is ISO string",
      !isNaN(Date.parse(fetched.read_at)) &&
        typeof fetched.read_at === "string",
    );
  }
  // Authorization checks
  TestValidator.equals("owner_id matches admin id", fetched.owner_id, admin.id);
  TestValidator.equals(
    "owner_type is 'administrator'",
    fetched.owner_type,
    "administrator",
  );
  // Check deleted_at is strictly null (not retrieved if deleted_at present)
  TestValidator.equals("deleted_at is null", fetched.deleted_at, null);
  // 5. Test retrieving a non-existent notification results in error
  await TestValidator.error("non-existent notification retrieval", async () => {
    await api.functional.shoppingMall.administrator.userNotifications.at(
      adminConnection,
      {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
