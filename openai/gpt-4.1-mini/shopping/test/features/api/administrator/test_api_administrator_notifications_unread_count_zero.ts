import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallUserNotificationUnreadCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationUnreadCount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_unread_count_zero(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new connection for administrator and join (register)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
    },
  });
  typia.assert(adminAuthorized);
  // 2. Use the adminConnection (with authorization header set) to get unread notification count
  const unreadCount =
    await api.functional.shoppingMall.administrator.notifications.unread_count.unreadCount(
      adminConnection,
    );
  typia.assert(unreadCount);
  // 3. Validate that the unread notification count is zero
  TestValidator.equals(
    "unread notification count should be zero",
    unreadCount.count,
    0,
  );
}
