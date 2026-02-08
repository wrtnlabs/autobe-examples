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

export async function test_api_seller_user_notification_access_denied(
  connection: api.IConnection,
) {
  // Prepare seller connection by joining as a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authSeller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authSeller);
  // Update sellerConnection headers for authorization
  sellerConnection.headers = {
    Authorization: authSeller.token.access,
  };
  // Generate a random UUID that simulates a userNotificationId which does NOT belong to this seller
  const unauthorizedNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to get user notification with unauthorized id and expect error
  await TestValidator.httpError(
    "seller trying to get another user's notification should fail",
    [401, 404],
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.atUserNotification(
        sellerConnection,
        {
          userNotificationId: unauthorizedNotificationId,
        },
      );
    },
  );
}
