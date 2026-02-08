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

export async function test_api_seller_notifications_send_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // Per schema, IShoppingMallSeller.IJoin is empty object, so pass empty {}
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Prepare notification send request
  // Per schema, IShoppingMallUserNotification.ISendRequest is {} (empty object), so pass empty {}
  const body: IShoppingMallUserNotification.ISendRequest = {};
  // 3. Send notification
  const response =
    await api.functional.shoppingMall.seller.notifications.send.sendNotification(
      sellerConnection,
      {
        body,
      },
    );
  typia.assert(response);
}
