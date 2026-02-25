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

export async function test_api_administrator_user_notification_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to retrieve a user notification with valid notificationId but as an administrator not authorized for this notification (ownerId or ownerType mismatch). Expect an authorization failure with appropriate HTTP error code preventing data leakage.
  // 1. Admin join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  // 2. Generate a random notificationId and create owner id and type that do not match the authenticated admin
  const fakeNotificationId = typia.random<string & tags.Format<"uuid">>();
  const fakeOwnerId = typia.random<string & tags.Format<"uuid">>();
  const fakeOwnerType = "customer"; // Different owner_type from administrator
  // 3. Attempt to retrieve the notification as the admin who is NOT authorized
  await TestValidator.httpError(
    "authorization failure on unauthorized admin",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.at(
        adminConnection,
        {
          notificationId: fakeNotificationId,
        },
      );
    },
  );
}
