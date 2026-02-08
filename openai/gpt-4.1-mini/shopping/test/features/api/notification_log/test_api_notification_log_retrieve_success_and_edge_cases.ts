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

export async function test_api_notification_log_retrieve_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Admin authentication and successful retrieval of existing notification log
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate administrator using provided join utility function (registration)
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // adminConnection.headers updated internally by authorize_administrator_join
  // For successful retrieval, need a valid existing notificationLogId
  // Since no creation API provided, use typia.random to simulate a valid UUID
  // (In actual E2E, would create a notification log first or get one from fixture)
  // Here, use typia.random string with uuid format for testing structural correctness
  const existingNotificationLogId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the notification log by ID
  const notificationLog =
    await api.functional.shoppingMall.administrator.notificationLogs.at(
      adminConnection,
      {
        notificationLogId: existingNotificationLogId,
      },
    );
  typia.assert(notificationLog);
  // Scenario 2: Retrieval attempt with a well-formed but non-existent UUID
  // Generate another random UUID assumed not to exist
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent notificationLogId retrieval should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.notificationLogs.at(
        adminConnection,
        {
          notificationLogId: nonExistentUUID,
        },
      );
    },
  );
  // Scenario 3: Retrieval attempt without administrator authorization
  // Use a fresh unauthenticated connection (no auth headers)
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized retrieval without admin auth should return 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.notificationLogs.at(
        unauthConnection,
        {
          notificationLogId: existingNotificationLogId,
        },
      );
    },
  );
}
