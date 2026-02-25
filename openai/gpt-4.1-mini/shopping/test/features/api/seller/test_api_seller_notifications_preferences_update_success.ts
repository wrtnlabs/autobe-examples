import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_notifications_preferences_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller and authorize
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(2),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoUri: null,
    },
  });
  typia.assert(authorizedSeller);
  // Create a new connection with authorization header using access token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Prepare valid notification preference data
  const notificationPreferences = {
    channelName: RandomGenerator.pick(["email", "sms", "push"]),
    notificationType: RandomGenerator.pick([
      "order_update",
      "promotion",
      "system_alert",
    ]),
    isEnabled: true,
  } satisfies IShoppingMallUserNotificationPreference.IUpdate;
  // 3. Update the seller's notification preferences
  await api.functional.shoppingMall.seller.notifications.preferences.updatePreferences(
    sellerConnection,
    { body: notificationPreferences },
  );
  // 4. Verify that the preferences updated correctly in the database by re-fetching (if GET API existed). Since no GET for preferences is provided, test success of update operation only.
  // Since update returns 204 No Content, test that function runs without error and no response body
  // And trust endpoint's persistence as per service contract.
  TestValidator.predicate(
    "Notification preferences update did not throw error",
    true,
  );
}
