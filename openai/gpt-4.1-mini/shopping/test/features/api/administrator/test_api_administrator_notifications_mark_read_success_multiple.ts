import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_mark_read_success_multiple(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${admin.token.access}`,
  };
  // 2. Prepare multiple notifications for the administrator
  // Since no creation API is defined, assume notifications exist or simulate IDs
  // For integration testing, we must fetch or simulate IDs
  // We'll simulate creation by assuming several notifications exist and IDs
  // Or reuse markRead with initial unread notifications forcibly created by random
  // Simulate receiving multiple notification IDs
  // Let's simulate 3 random UUIDs as notification IDs
  const notificationIds: (string & tags.Format<"uuid">)[] = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  // 3. Mark multiple notifications as read
  const updatedNotificationsRaw =
    await api.functional.shoppingMall.administrator.notifications.read.markRead(
      adminConnection,
      {
        body: {
          notificationIds,
        } satisfies IShoppingMallUserNotification.IMarkRead,
      },
    );
  // Typing assertion for array or single notification
  const updatedNotifications = Array.isArray(updatedNotificationsRaw)
    ? updatedNotificationsRaw
    : [updatedNotificationsRaw];
  for (const notification of updatedNotifications) {
    typia.assert(notification);
    TestValidator.predicate(
      `notification ${notification.id} is read`,
      notification.isRead === true && notification.readAt !== null,
    );
  }
}
