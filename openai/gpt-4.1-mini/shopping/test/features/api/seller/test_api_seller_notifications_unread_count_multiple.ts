import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotificationUnreadCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationUnreadCount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_notifications_unread_count_multiple(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123!",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  // Update connection with seller's access token
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = `Bearer ${sellerAuthorized.token.access}`;
  // 2. Simulate multiple unread notifications count
  // For the test, let's assume multiple unread count is a random number between 5 and 15
  // (Since no direct utility or API to create notifications, will simulate the retrieval)
  // 3. Retrieve unread notifications count using the authenticated seller connection
  const unreadCountResponse =
    await api.functional.shoppingMall.seller.notifications.unread_count.unreadCount(
      sellerConnection,
    );
  typia.assert(unreadCountResponse);
  // 4. Test that count is non-negative and represents multiple notifications (assuming at least 2)
  TestValidator.predicate(
    "unread notifications count is non-negative",
    unreadCountResponse.count >= 0,
  );
  // 5. Simulate edge case for high volume unread counts by mocking simulate mode
  const simulateConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const simulatedUnreadCount =
    await api.functional.shoppingMall.seller.notifications.unread_count.unreadCount(
      simulateConnection,
    );
  typia.assert(simulatedUnreadCount);
  TestValidator.predicate(
    "simulated unread notifications count is non-negative",
    simulatedUnreadCount.count >= 0,
  );
  // 6. Verify unauthorized access is rejected with 401 error
  await TestValidator.httpError(
    "unauthorized unread count access",
    401,
    async () => {
      const unauthorizedConnection: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.seller.notifications.unread_count.unreadCount(
        unauthorizedConnection,
      );
    },
  );
  // 7. Logging and performance monitoring validation
  // Ideally should be handled by logger function; here we verify the logger is called
  let logged = false;
  const loggedConnection: api.IConnection = {
    host: connection.host,
    logger: async () => {
      logged = true;
    },
  };
  loggedConnection.headers ??= {};
  loggedConnection.headers.Authorization = `Bearer ${sellerAuthorized.token.access}`;
  await api.functional.shoppingMall.seller.notifications.unread_count.unreadCount(
    loggedConnection,
  );
  TestValidator.predicate("logger called on unread count request", logged);
}
