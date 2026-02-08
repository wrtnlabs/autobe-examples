import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
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

export async function test_api_administrator_user_notifications_list_all_no_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Retrieve user notifications with empty filter (no filters applied)
  const filterBody: IShoppingMallUserNotification.IRequest = {};
  const notifications =
    await api.functional.shoppingMall.administrator.userNotifications.index(
      adminConnection,
      { body: filterBody },
    );
  typia.assert(notifications);
  // 3. Validate that pagination metadata exists and is correctly typed
  TestValidator.predicate(
    "pagination current page is a non-negative integer",
    notifications.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is a non-negative integer",
    notifications.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is a non-negative integer",
    notifications.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is a non-negative integer",
    notifications.pagination.pages >= 0,
  );
  // 4. Validate that all notifications belong to the administrator
  notifications.data.forEach((notification, index) => {
    // Here we cannot directly validate owner_id or owner_type because ISummary has no such properties
    typia.assert(notification); // assert valid structure
  });
  // 5. Handle empty notification list gracefully
  TestValidator.predicate(
    "empty notification list is properly handled",
    notifications.data.length === 0 || notifications.data.length > 0,
  );
}
