import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_notification_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to delete a non-existent user notification.
  // 1. Authenticate as an administrator (join).
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${administrator.token.access}`,
  };
  // 2. Attempt to delete a user notification with a random UUID that does not exist.
  const randomUserNotificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify the response returns HTTP 404 Not Found.
  await TestValidator.httpError(
    "delete non-existent user notification",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.erase(
        adminConnection,
        {
          userNotificationId: randomUserNotificationId,
        },
      );
    },
  );
}
