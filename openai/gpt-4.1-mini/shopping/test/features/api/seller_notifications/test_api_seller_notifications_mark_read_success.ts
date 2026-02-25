import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_notifications_mark_read_success(
  connection: api.IConnection,
): Promise<void> {
  /*
   * Test marking notifications as read by an authenticated seller.
   * 1. Seller joins and becomes an authenticated user.
   * 2. Create or assume multiple notifications owned by the seller.
   * 3. Mark some of the seller's notifications as read.
   * 4. Verify all marked notifications "isRead" flag set to true and readAt is not null, timestamp is recent.
   * 5. Attempt to mark notifications that include one or more not owned by the seller  expect 403 Forbidden.
   * 6. Ensure transaction atomicity: no partial update if unauthorized notification included (not verifiable here).
   */
  // 1. Seller join and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Prepare at least 3 owned notifications (simulate IDs since no creation API provided)
  const notificationIdsOwned: (string & tags.Format<"uuid">)[] =
    ArrayUtil.repeat(3, () => typia.random<string & tags.Format<"uuid">>());
  const markReadBody = {
    notificationIds: notificationIdsOwned,
  } satisfies IShoppingMallUserNotification.IMarkRead;
  // 3. Mark owned notifications as read
  const rawUpdatedNotifications =
    await api.functional.shoppingMall.seller.notifications.read.markRead(
      sellerConnection,
      { body: markReadBody },
    );
  const updatedNotifications = typia.assert<
    IShoppingMallUserNotification.ISummary[]
  >(rawUpdatedNotifications);
  // 4. Verify all updated notifications belong to seller, are read true, and readAt timestamp is recent
  for (const notification of updatedNotifications) {
    TestValidator.predicate(
      "notification owned by seller",
      notification.ownerType === "seller",
    );
    TestValidator.predicate(
      "notification is read",
      notification.isRead === true,
    );
    TestValidator.predicate(
      "notification readAt not null",
      notification.readAt !== null,
    );
    {
      // Check that readAt is valid ISO datetime and recent
      const readAtDate = new Date(notification.readAt!);
      const now = new Date();
      const delta = now.getTime() - readAtDate.getTime();
      TestValidator.predicate(
        "notification readAt is recent",
        delta >= 0 && delta < 60000,
      ); // within last 1 minute
    }
  }
  // 5. Attempt to mark notifications including one not owned by seller
  const unauthorizedNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "mark read forbidden on unauthorized notifications",
    403,
    async () => {
      await api.functional.shoppingMall.seller.notifications.read.markRead(
        sellerConnection,
        {
          body: {
            notificationIds: [
              ...notificationIdsOwned,
              unauthorizedNotificationId,
            ],
          } satisfies IShoppingMallUserNotification.IMarkRead,
        },
      );
    },
  );
  // 6. Transaction atomicity cannot be validated without GET API for notifications
}
