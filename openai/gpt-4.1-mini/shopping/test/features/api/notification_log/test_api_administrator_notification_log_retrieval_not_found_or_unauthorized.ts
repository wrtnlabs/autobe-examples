import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
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

export async function test_api_administrator_notification_log_retrieval_not_found_or_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to retrieve a notification log that does not exist and test authorization rejection on unauthorized access
  // Create admin connection and join administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `notfound_${String(Date.now())}@test.com`,
      password: "NotFoundPass123",
    },
  });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // Prepare a UUID that presumably does not exist
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // Test retrieval of non-existent notification log returns 404
  await TestValidator.httpError(
    "retrieve non-existent notification log should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.notificationLogs.atNotificationLog(
        adminConnection,
        { logId: nonExistentLogId },
      );
    },
  );
  // Create another administrator who will not have permission to access the notification log
  const unauthorizedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedAdminAuthorized = await authorize_administrator_join(
    unauthorizedAdminConnection,
    {
      body: {
        email: `unauth_${String(Date.now())}@test.com`,
        password: "UnauthPass123",
      },
    },
  );
  unauthorizedAdminConnection.headers = {
    Authorization: unauthorizedAdminAuthorized.token.access,
  };
  // Attempt to access the non-existent notification log with unauthorized admin - expect 403 Forbidden (authorization failure)
  await TestValidator.httpError(
    "unauthorized administrator retrieving notification log should return 403",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.notificationLogs.atNotificationLog(
        unauthorizedAdminConnection,
        { logId: nonExistentLogId },
      );
    },
  );
}
