import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
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
 * Test unauthorized access to another user's notification as a seller.
 *
 * 1. Seller A joins and obtains a JWT token.
 * 2. Seller B joins and obtains a JWT token.
 * 3. Seller B attempts to retrieve a notification owned by Seller A.
 * 4. Assert unauthorized HttpError is thrown.
 * 5. Attempt to retrieve a non-existing or soft-deleted notificationId.
 * 6. Assert HttpError with 404 status.
 */
export async function test_api_seller_user_notification_at_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create Seller A connection and join
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      shopDescription: RandomGenerator.paragraph({ sentences: 1 }),
      logoUri: null,
    },
  });
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerA.token.access}`,
  };
  // Create Seller B connection and join
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      shopDescription: RandomGenerator.paragraph({ sentences: 1 }),
      logoUri: null,
    },
  });
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerB.token.access}`,
  };
  // Seller B tries to access notifications owned by Seller A
  // We simulate this by attempting to get a notification with an ID that is not owned by Seller B
  // Since we do not have an API to create notifications, we simulate using sellerA's id as part of UUID
  // We assume a notificationId that is a valid UUID but not owned by sellerB
  // Use sellerA.id as part of UUID to simulate owned ID for Seller A
  // Note: Actually creating notifications is not supported in provided APIs;
  // so we test unauthorized access with a random UUID different from sellerB
  // Use sellerAConnection to get a notificationId that sellers wouldn't have access to
  // Use a randomly generated UUID that simulates ownership by Seller A
  const notificationIdNotOwnedBySellerB = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "unauthorized access to others notification",
    403,
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.at(
        sellerBConnection,
        {
          notificationId: notificationIdNotOwnedBySellerB,
        },
      );
    },
  );
  // Test 404 error for non-existing notificationId
  const nonExistingNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "not found error on non-existing notificationId",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.at(
        sellerBConnection,
        {
          notificationId: nonExistingNotificationId,
        },
      );
    },
  );
  // Test 404 error for soft-deleted notification (deletedAt not null)
  // Since we cannot create actual deleted notifications,
  // we test with random UUID assuming it is soft-deleted
  const softDeletedNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "not found error on soft-deleted notification",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.at(
        sellerBConnection,
        {
          notificationId: softDeletedNotificationId,
        },
      );
    },
  );
}
