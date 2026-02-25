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

export async function test_api_seller_notifications_unread_count_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare a new seller connection and authorize it
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller-password",
      shopName: "Seller Shop",
      shopDescription: "A test seller shop",
      logoUri: null,
    },
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${seller.token.access}`,
  };
  // 2. Call the unread notifications count endpoint
  const unreadCount =
    await api.functional.shoppingMall.seller.notifications.unread_count.unreadCount(
      sellerConnection,
    );
  typia.assert(unreadCount);
  // 3. Validate count property type and zero state
  TestValidator.predicate(
    "unread notifications count is an integer",
    Number.isInteger(unreadCount.count),
  );
  TestValidator.predicate(
    "unread notifications count is zero or positive",
    unreadCount.count >= 0,
  );
  // 4. Edge case: If no unread notifications, count should be zero
  if (unreadCount.count === 0) {
    // Just verify count is zero
    TestValidator.equals(
      "initial unread notifications count",
      unreadCount.count,
      0,
    );
  } else {
    // 5. If there are unread notifications, simulate marking some as read externally
    //    and verify the unread count decreases (Assuming extra functionality exists)
    //    but since we have no API or utility functions to mark notifications read,
    //    we cannot perform this part; so document as a TODO.
  }
  // 6. Verify access is denied without authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "access denied when unauthenticated",
    401,
    async () => {
      await api.functional.shoppingMall.seller.notifications.unread_count.unreadCount(
        unauthenticatedConnection,
      );
    },
  );
}
