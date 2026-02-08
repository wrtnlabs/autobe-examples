import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_user_notification_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion of a user notification that does not exist in the system.
  // Verify the response returns 404 Not Found. Confirm no deletion occurs in the database.
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // Update connection with Authorization header
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to delete a non-existent notification by random UUID
  const fakeNotificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call API and expect 404 error
  await TestValidator.httpError(
    "delete non-existing user notification returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.erase(
        sellerConnection,
        {
          userNotificationId: fakeNotificationId,
        },
      );
    },
  );
}
