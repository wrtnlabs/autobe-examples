import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_send_notification_recipient_user_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate administrator
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorized);
  // Set Authorization header for further calls
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // Step 3: Prepare minimal empty notification send request
  const sendRequestBody: IShoppingMallUserNotification.ISendRequest = {};
  // Step 4: Attempt to send notification and expect error
  await TestValidator.error(
    "sending notification with empty/invalid recipient user should fail",
    async () => {
      const output =
        await api.functional.shoppingMall.administrator.notifications.send.sendNotification(
          adminConnection,
          { body: sendRequestBody },
        );
      typia.assert(output); // If no error thrown, fail the test
    },
  );
}
