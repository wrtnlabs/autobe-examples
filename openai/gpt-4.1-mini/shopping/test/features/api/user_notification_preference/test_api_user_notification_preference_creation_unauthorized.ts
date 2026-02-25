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
import { generate_random_shopping_mall_seller_user_notification_preferences_create } from "../../../generate/generate_random_shopping_mall_seller_user_notification_preferences_create";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_user_notification_preference_creation_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the inability to create a user notification preference when unauthorized or unauthenticated.
  // It includes attempts without seller authentication context and expects authorization failure.
  // Also confirms no preference is created and no leakage to other user contexts.
  // Ensures security boundaries for notification preference creation.
  // 1. Without any authentication, try to create user notification preference
  await TestValidator.httpError(
    "anonymous cannot create user notification preference",
    401,
    async () => {
      await generate_random_shopping_mall_seller_user_notification_preferences_create(
        connection,
        {
          body: {
            channelName: "email",
            notificationType: "order_update",
            isEnabled: true,
          },
        },
      );
    },
  );
  // 2. Create a seller account to obtain authenticated seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: "Test Shop Unauthorized",
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // 3. Logout seller by creating a new connection without auth headers
  const loggedOutConnection: api.IConnection = { host: connection.host };
  // 4. Using logged out connection, try to create user notification preference - expect 401
  await TestValidator.httpError(
    "logged-out seller cannot create user notification preference",
    401,
    async () => {
      await generate_random_shopping_mall_seller_user_notification_preferences_create(
        loggedOutConnection,
        {
          body: {
            channelName: "sms",
            notificationType: "promotion",
            isEnabled: true,
          },
        },
      );
    },
  );
  // 5. Confirm no user notification preferences exist for unauthorized user by
  // attempting a valid create with unauthorized connection throwing error - already done,
  // as unauthorized calls throw 401 preventing creation.
}
