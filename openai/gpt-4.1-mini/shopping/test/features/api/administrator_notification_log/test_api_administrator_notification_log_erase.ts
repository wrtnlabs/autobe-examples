import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notification_log_erase(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing notification log entry by an authorized administrator.
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  const authorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  // For testing, generate a random UUID for notificationLogId
  const notificationLogId = typia.random<string & tags.Format<"uuid">>();
  // Delete notification log with valid authorization
  const deletedLog =
    await api.functional.shoppingMall.administrator.notificationLogs.erase(
      adminConnection,
      { notificationLogId },
    );
  typia.assert(deletedLog);
  // Scenario 2: Attempt to delete non-existent notification log entry by authorized admin
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent log returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.notificationLogs.erase(
        adminConnection,
        { notificationLogId: nonExistentId },
      );
    },
  );
  // Scenario 3: Attempt to delete without authorization
  const anonConnection: api.IConnection = { host: connection.host };
  const someId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized delete returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.notificationLogs.erase(
        anonConnection,
        { notificationLogId: someId },
      );
    },
  );
}
