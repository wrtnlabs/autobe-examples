import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test deletion failure for non-existent user notification by an authenticated administrator.
 * 1. Administrator joins (signs up) and is authorized.
 * 2. Attempts to delete a user notification with a random UUID that does not exist.
 * 3. Expects an HTTP error indicating failure (e.g. 404 Not Found or 403 Forbidden).
 */
export async function test_api_administrator_user_notification_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234",
    },
  });
  adminConnection.headers = { Authorization: admin.token.access };
  // 2. Attempt to erase a non-existent user notification
  const fakeNotificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect error on delete call
  await TestValidator.httpError(
    "delete non-existent user notification should fail",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.erase(
        adminConnection,
        { notificationId: fakeNotificationId },
      );
    },
  );
}
