import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_user_notifications_filtered_by_status_and_type(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Verify that an authenticated seller can retrieve user notifications
  // filtered by read/unread status and notification type, including pagination.
  // 1. Seller registration and get authorization token
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join({ host: connection.host }, { body: {} });
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Test with isRead = true, notificationType = 'info'
  const filterTrue: IShoppingMallUserNotification.IRequest = {
    isRead: true,
    notificationType: "info",
    pagination: { current: 1, limit: 10 },
  };
  const resultTrue: IPageIShoppingMallUserNotification.ISummary =
    await api.functional.shoppingMall.seller.userNotifications.index(
      sellerConnection,
      { body: filterTrue },
    );
  typia.assert(resultTrue);
  // Validate pagination is correct
  TestValidator.predicate(
    "pagination current page 1",
    resultTrue.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit 10",
    resultTrue.pagination.limit === 10,
  );
  // Validate no notifications exceed the pagination limit
  TestValidator.predicate(
    "result data length <= pagination limit",
    resultTrue.data.length <= resultTrue.pagination.limit,
  );
  // 3. Test with isRead = false, notificationType = 'alert'
  const filterFalse: IShoppingMallUserNotification.IRequest = {
    isRead: false,
    notificationType: "alert",
    pagination: { current: 1, limit: 10 },
  };
  const resultFalse: IPageIShoppingMallUserNotification.ISummary =
    await api.functional.shoppingMall.seller.userNotifications.index(
      sellerConnection,
      { body: filterFalse },
    );
  typia.assert(resultFalse);
  TestValidator.predicate(
    "pagination current page 1",
    resultFalse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit 10",
    resultFalse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "result data length <= pagination limit",
    resultFalse.data.length <= resultFalse.pagination.limit,
  );
}
