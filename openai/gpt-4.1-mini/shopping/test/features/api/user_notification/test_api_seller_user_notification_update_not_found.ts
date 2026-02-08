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

/**
 * Scenario 2: Updating a non-existent user notification returns 404 Not Found.
 */
export async function test_api_seller_user_notification_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers (join)
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {} as Partial<IShoppingMallSeller.IJoin>,
  });
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Attempt to update a non-existent user notification
  // Prepare an invalid UUID
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update body (empty object as we don't need valid data, just role)
  const updateBody: IShoppingMallUserNotification.IUpdate = {};
  await TestValidator.httpError(
    "Notification update with non-existent id returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.updateUserNotification(
        sellerConnection,
        {
          userNotificationId: invalidId,
          body: updateBody,
        },
      );
    },
  );
}
