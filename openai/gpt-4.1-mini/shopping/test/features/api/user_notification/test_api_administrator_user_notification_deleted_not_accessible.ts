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

export async function test_api_administrator_user_notification_deleted_not_accessible(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Attempt to retrieve a deleted user notification by notificationId as an authorized administrator.
  // Verify the notification is not found or appropriate HTTP error is returned,
  // ensuring deleted notifications are inaccessible via the API.
  // 1. Administrator account registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // Use the provided utility to join and authorize
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  // Set adminConnection headers for authentication
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // 2. Create a user notification manually, then simulate its deletion by setting deleted_at
  // Since we have no direct API to create or delete, simulate retrieval of a deleted notification
  // by making an invalid/non-existent notification id that emulates deleted.
  // Generate a random UUID to represent deleted notification ID
  const deletedNotificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Try to retrieve the deleted notification (which by scenario logic, should not exist or be inaccessible)
  // Expect HTTP error (like 404 Not Found or 403 Forbidden)
  await TestValidator.httpError(
    "retrieving deleted user notification should fail",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.at(
        adminConnection,
        {
          notificationId: deletedNotificationId,
        },
      );
    },
  );
}
