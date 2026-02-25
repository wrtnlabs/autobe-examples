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

export async function test_api_user_notification_preference_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the successful creation of a user notification preference by an authenticated seller.
  // 1. Seller joins to get authenticated and authorized connection.
  // 2. Create multiple notification preferences with varying channelName and notificationType.
  // 3. Verify the created notification preference matches input and is linked to the authenticated seller.
  // 4. Validate duplicate or conflicting preference error handling excluded from this test.
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authorizedSeller);
  // Update sellerConnection with Authorization header
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = authorizedSeller.token.access;
  const sellerId = authorizedSeller.id;
  // Test multiple diverse notification preference creations to validate flexibility
  const testPreferences: IShoppingMallUserNotificationPreference.ICreate[] = [
    {
      channelName: "email",
      notificationType: "order_update",
      isEnabled: true,
      sellerId: sellerId,
    },
    {
      channelName: "sms",
      notificationType: "promotion",
      isEnabled: false,
      sellerId: sellerId,
    },
    {
      channelName: "push",
      notificationType: "system_alert",
      isEnabled: true,
      sellerId: sellerId,
    },
  ];
  for (const createBody of testPreferences) {
    const createdPreference =
      await generate_random_shopping_mall_seller_user_notification_preferences_create(
        sellerConnection,
        {
          body: createBody,
        },
      );
    typia.assert(createdPreference);
    // Validate fields match request
    TestValidator.equals(
      "channelName matches",
      createdPreference.channelName,
      createBody.channelName,
    );
    TestValidator.equals(
      "notificationType matches",
      createdPreference.notificationType,
      createBody.notificationType,
    );
    TestValidator.equals(
      "isEnabled matches",
      createdPreference.isEnabled,
      createBody.isEnabled,
    );
    // Validate sellerId matches authorized seller id
    TestValidator.equals(
      "sellerId matches authorized",
      createdPreference.sellerId,
      sellerId,
    );
  }
  // Ensure only authenticated seller can create their preferences
  // Attempting creation with a different sellerId should not be allowed in normal flow
  // but since this scenario does not include negative tests, just notes here.
}
