import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
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

export async function test_api_administrator_notifications_retrieve_unread_only(
  connection: api.IConnection,
): Promise<void> {
  /*
      Scenario Description:
      - Authenticate as a new administrator user via join.
      - Attempt to call the notifications retrieval PATCH endpoint with filter { isRead: false }.
      - Verify the response is valid, all notifications have isRead set to false.
      - Validate pagination metadata correctness.
      - Also verify that calling the endpoint without authorization results in an error (access control).
    */
  // 1. Prepare admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  // The authorize call updates adminConnection.headers internally
  // 2. Use adminConnection to call notifications endpoint with isRead: false
  const filterRequest: IShoppingMallUserNotification.IRequest = {
    isRead: false,
  };
  const notificationsPage =
    await api.functional.shoppingMall.administrator.notifications.index(
      adminConnection,
      { body: filterRequest },
    );
  typia.assert(notificationsPage);
  // 3. Validate all returned notifications have isRead=false
  for (const notification of notificationsPage.data) {
    TestValidator.equals("notification is unread", notification.isRead, false);
  }
  // 4. Validate pagination metadata
  const pagination = notificationsPage.pagination;
  TestValidator.predicate(
    "pagination current page >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // 5. Test unauthorized access gives HttpError 401 or 403
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access should be denied",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.notifications.index(
        noAuthConnection,
        {
          body: filterRequest,
        },
      );
    },
  );
}
