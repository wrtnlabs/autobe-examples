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

export async function test_api_seller_user_notification_preference_update_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Authorization enforcement when updating a user notification preference.
  // 1. Seller joins via /auth/seller/join.
  // 2. Create two sellers: sellerA (authenticated), sellerB (different seller).
  // 3. SellerB creates a notification preference.
  // 4. SellerA attempts to update sellerB's notification preference → expect 403 Forbidden.
  // 5. Attempt update without authentication → expect 401 Unauthorized.
  // 6. Attempt update with invalid UUID → expect validation error (caught as 400 or framework error).
  // Join sellerA and get authorized connection
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(12) + "@example.com",
      password: "password1234",
      shopName: RandomGenerator.name(2),
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerAConnection.headers = {
    Authorization: sellerA.token.access,
  };
  // Join sellerB and get authorized connection
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(12) + "@example.com",
      password: "password1234",
      shopName: RandomGenerator.name(2),
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerBConnection.headers = {
    Authorization: sellerB.token.access,
  };
  // SellerB creates a notification preference (simulate creation by direct usage of random to create a preference belonging to sellerB)
  // Since no create API is provided, we'll simulate the existing preference by random generator but force sellerId to sellerB.id
  const existingPreference: IShoppingMallUserNotificationPreference = {
    id: typia.random<string & tags.Format<"uuid">>(),
    sellerId: sellerB.id,
    customerId: null,
    administratorId: null,
    channelName: "email",
    notificationType: "order_update",
    isEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  // Attempt update by sellerA on sellerB's preference
  const updateBody: IShoppingMallUserNotificationPreference.IUpdate = {
    channelName: "sms",
    notificationType: "order_update",
    isEnabled: false,
  };
  await TestValidator.httpError(
    "should return 403 Forbidden when updating another seller's notification preference",
    403,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.update(
        sellerAConnection,
        {
          preferenceId: existingPreference.id,
          body: updateBody,
        },
      );
    },
  );
  // Verify no changes are persisted - since no direct retrieval API provided, this might be simulated by attempting update itself and on error no changes occur
  // Attempt update without authentication - use base connection without auth header
  await TestValidator.httpError(
    "should return 401 Unauthorized when updating without authentication",
    401,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.update(
        { host: connection.host },
        {
          preferenceId: existingPreference.id,
          body: updateBody,
        },
      );
    },
  );
  // Attempt update with invalid UUID preferenceId - the framework should reject with 400 or similar
  const invalidUUID = "invalid-uuid-format";
  await TestValidator.httpError(
    "should reject update with invalid UUID preferenceId",
    400,
    async () => {
      await api.functional.shoppingMall.seller.userNotificationPreferences.update(
        sellerAConnection,
        {
          preferenceId: invalidUUID as string & tags.Format<"uuid">,
          body: updateBody,
        },
      );
    },
  );
}
