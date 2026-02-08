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

export async function test_api_administrator_user_notification_retrieve_with_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve a user notification by a valid notification ID
  // 1. Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Setup authorization header
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Use a random UUID as userNotificationId because no creation API provided
  const validNotificationId = typia.random<string & tags.Format<"uuid">>();
  // Call the endpoint with a valid ID
  const notification =
    await api.functional.shoppingMall.administrator.userNotifications.atUserNotification(
      adminConnection,
      {
        userNotificationId: validNotificationId,
      },
    );
  typia.assert(notification);
  // Scenario 2: Attempt to retrieve with a non-existent notification ID
  const nonExistentId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  await TestValidator.httpError(
    "non-existent notification returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.atUserNotification(
        adminConnection,
        { userNotificationId: nonExistentId },
      );
    },
  );
  // Scenario 3: Attempt to retrieve as unauthenticated user (no Authorization header)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.atUserNotification(
        unauthenticatedConnection,
        { userNotificationId: validNotificationId },
      );
    },
  );
}
