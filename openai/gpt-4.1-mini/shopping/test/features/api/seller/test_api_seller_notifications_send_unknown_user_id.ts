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

export async function test_api_seller_notifications_send_unknown_user_id(
  connection: api.IConnection,
): Promise<void> {
  // Test sending a user notification with empty body which should fail due to unknown user
  // 1. Seller registration for authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authorizedSeller);
  // Update sellerConnection with the authorized token
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Attempt to send notification with empty body
  await TestValidator.error(
    "sending notification with unknown user should fail",
    async () => {
      await api.functional.shoppingMall.seller.notifications.send.sendNotification(
        sellerConnection,
        {
          body: {},
        },
      );
    },
  );
}
