import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_user_notifications_create_user_notification } from "../../../generate/generate_random_shopping_mall_seller_user_notifications_create_user_notification";

export async function test_api_seller_user_notification_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  sellerConnection.headers = { Authorization: authorized.token.access };

  // 2. Seller creates a user notification
  const notification =
    await generate_random_shopping_mall_seller_user_notifications_create_user_notification(
      sellerConnection,
      { body: {} },
    );
  typia.assert(notification);

  // 3. Seller updates the notification
  const now = new Date();
  const updateBody: IShoppingMallUserNotification.IUpdate = {
    title: RandomGenerator.name(),
    body: RandomGenerator.paragraph({ sentences: 3 }),
    url: `https://example.com/${RandomGenerator.alphabets(8)}`,
    imageUrl: `https://images.example.com/${RandomGenerator.alphabets(8)}.jpg`,
    isRead: true,
    deliveredAt: now.toISOString(),
    readAt: new Date(now.getTime() + 1000).toISOString(),
  };

  const updatedNotification =
    await api.functional.shoppingMall.seller.userNotifications.updateUserNotification(
      sellerConnection,
      {
        userNotificationId: notification["id" as keyof typeof notification] ?? null,
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);

  // Validate that update returned a result
  TestValidator.predicate(
    "updatedNotification is not null",
    updatedNotification !== null && updatedNotification !== undefined,
  );
}
