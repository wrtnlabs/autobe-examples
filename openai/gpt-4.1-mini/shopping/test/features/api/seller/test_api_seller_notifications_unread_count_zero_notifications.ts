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

export async function test_api_seller_notifications_unread_count_zero_notifications(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario covers the edge case where the seller has no unread notifications.
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test@1234",
      shopName: "TestShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  // Update the sellerConnection headers with token for authenticated requests
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Query unread notifications count for the seller
  const unreadCount =
    await api.functional.shoppingMall.seller.notifications.unread_count.unreadCount(
      sellerConnection,
    );
  typia.assert(unreadCount);
  // Validate unread count is zero
  TestValidator.equals("unread notifications count", unreadCount.count, 0);
  // 3. Confirm unauthorized access is rejected with 401
  await TestValidator.httpError(
    "unauthorized access without login",
    401,
    async () => {
      await api.functional.shoppingMall.seller.notifications.unread_count.unreadCount(
        connection,
      );
    },
  );
}
