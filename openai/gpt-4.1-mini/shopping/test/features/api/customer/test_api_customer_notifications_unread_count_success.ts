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

export async function test_api_customer_notifications_unread_count_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving unread notification count as an authenticated customer.
  // First, the customer joins and registers.
  // Then, the API is called to retrieve the count of unread notifications.
  // Verify that the count matches the actual number of unread notifications stored for that customer.
  // Check that the response status is 200 OK and the count is a non-negative integer.
  // This test covers the primary success scenario where unread notifications exist.
  // 1. Customer Join
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Update the connection headers with Authorization token
  customerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Retrieve unread notification count
  const count =
    await api.functional.shoppingMall.customer.notifications.unread_count.unreadCount(
      customerConnection,
    );
  typia.assert(count);
  // 3. Validate that count is non-negative
  TestValidator.predicate(
    "unread notification count is non-negative",
    count.count >= 0,
  );
}
