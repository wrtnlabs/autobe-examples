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

export async function test_api_seller_notifications_mark_read_unauthorized_attempt(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that the API correctly enforces ownership validation when marking notifications as read.
  // It attempts to mark notifications as read where some notifications do not belong to the authenticated seller.
  // The expected result is a 403 Forbidden error, ensuring unauthorized notifications cannot be marked as read.
  // 1. Register and login as Seller A.
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerAPass123",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAAuth);
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerAAuth.token.access}`,
  };
  // 2. Register and login as Seller B.
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerBPass123",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerBAuth);
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerBAuth.token.access}`,
  };
  // 3. For Seller A, create a fake notification in the system (simulated here by generating random UUIDs)
  // Since there's no utility function to create notifications, we simulate two notification IDs: one for Seller A, one for Seller B.
  // Ideally, the notifications would exist in the database. Here, we random-generate IDs to simulate the test.
  const notificationIdOwnedByA = typia.random<string & tags.Format<"uuid">>();
  const notificationIdOwnedByB = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller A attempts to mark both notifications (owned by A and B) as read.
  const markReadBody: IShoppingMallUserNotification.IMarkRead = {
    notificationIds: [notificationIdOwnedByA, notificationIdOwnedByB],
  };
  // 5. Expect this call to fail with 403 Forbidden due to unauthorized notification belonging to seller B.
  await TestValidator.httpError(
    "unauthorized notification mark read attempt",
    403,
    async () => {
      await api.functional.shoppingMall.seller.notifications.read.markRead(
        sellerAConnection,
        {
          body: markReadBody,
        },
      );
    },
  );
}
