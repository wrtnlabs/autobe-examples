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
import { generate_random_shopping_mall_seller_user_notifications_create_user_notification } from "../../../generate/generate_random_shopping_mall_seller_user_notifications_create_user_notification";
import { prepare_random_shopping_mall_user_notification } from "../../../prepare/prepare_random_shopping_mall_user_notification";

/**
 * Scenario 3: Unauthorized seller attempts to update another seller's notification.
 * Steps:
 * 1. Seller A registers (join) and creates a user notification.
 * 2. Seller B registers (join).
 * 3. Seller B attempts to update Seller A's user notification.
 * Expect:
 * The system returns a 403 forbidden error preventing unauthorized update attempts,
 * validating ownership enforcement.
 */
export async function test_api_seller_user_notification_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A registration with separate connection
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerAConnection, {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    });
  sellerAConnection.headers ??= {};
  sellerAConnection.headers.Authorization = sellerAAuth.token.access;
  // 2. Seller A creates a user notification
  const sellerUserNotification: IShoppingMallUserNotification =
    await generate_random_shopping_mall_seller_user_notifications_create_user_notification(
      sellerAConnection,
      {},
    );
  typia.assert(sellerUserNotification);
  // 3. Seller B registration with separate connection
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerBConnection, {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    });
  sellerBConnection.headers ??= {};
  sellerBConnection.headers.Authorization = sellerBAuth.token.access;
  // 4. Seller B attempts to update Seller A's user notification
  const updateBody: IShoppingMallUserNotification.IUpdate =
    typia.random<IShoppingMallUserNotification.IUpdate>();
  await TestValidator.httpError(
    "unauthorized update attempt",
    403,
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.updateUserNotification(
        sellerBConnection,
        {
          userNotificationId: (sellerUserNotification as unknown as { userNotificationId: string }).userNotificationId,
          body: updateBody,
        },
      );
    },
  );
}
