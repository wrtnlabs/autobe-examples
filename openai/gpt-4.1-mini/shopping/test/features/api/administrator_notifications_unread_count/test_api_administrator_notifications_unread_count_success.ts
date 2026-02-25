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

export async function test_api_administrator_notifications_unread_count_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${administrator.token.access}`,
  };
  // Initial unread notification count
  const initialCount =
    await api.functional.shoppingMall.administrator.notifications.unread_count.unreadCount(
      adminConnection,
    );
  typia.assert(initialCount);
  // For test purpose, assume initialCount.count is valid and simulate the scenario
  // Although we do not have an API to create notifications, simulate unread count increment by re-fetch
  // Re-fetch unread count and ensure count is a non-negative integer
  const secondCount =
    await api.functional.shoppingMall.administrator.notifications.unread_count.unreadCount(
      adminConnection,
    );
  typia.assert(secondCount);
  // Validate counts are equal or second count >= initial count (simulate new notifications arrival)
  TestValidator.predicate(
    "unread count non-negative",
    initialCount.count >= 0 && secondCount.count >= 0,
  );
  TestValidator.predicate(
    "unread count not decreased",
    secondCount.count >= initialCount.count,
  );
}
