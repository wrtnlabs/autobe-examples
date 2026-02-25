import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotificationUnreadCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationUnreadCount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_notifications_unread_count_empty(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that an authenticated customer with no unread notifications receives a count of zero.
  // 1. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    },
  });
  typia.assert(joinResult);
  // Setup customerConnection with authorization token
  customerConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // 2. Retrieve unread notification count
  const unreadCount =
    await api.functional.shoppingMall.customer.notifications.unread_count.unreadCount(
      customerConnection,
    );
  typia.assert(unreadCount);
  // 3. Assert that unread count is zero
  TestValidator.equals("unread notification count", unreadCount.count, 0);
}
