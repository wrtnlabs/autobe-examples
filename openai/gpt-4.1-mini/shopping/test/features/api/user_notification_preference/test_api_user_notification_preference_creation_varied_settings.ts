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

export async function test_api_user_notification_preference_creation_varied_settings(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests seller's ability to create various notification preferences
  // with different channels and notification types, ensuring enabled/disabled toggling,
  // and isolation between different seller users.
  // Step 1: Seller Join (first seller)
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "firstSellerPass123",
      shopName: "First Seller Shop",
      shopDescription: "The first seller in the test",
      logoUri: null,
    },
  });
  typia.assert(firstSeller);
  // Step 2: Seller Join (second seller)
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secondSellerPass123",
      shopName: "Second Seller Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(secondSeller);
  // Define notification channels and types
  const channels = ["email", "sms", "push"] as const;
  const notificationTypes = [
    "order_update",
    "promotion",
    "system_alert",
  ] as const;
  // Step 3: Create various preferences for first seller
  const firstSellerPreferences: IShoppingMallUserNotificationPreference[] = [];
  for (const channel of channels) {
    for (const type of notificationTypes) {
      // alternate enabled flag true/false based on index to test toggling
      const isEnabled = (channel + type).length % 2 === 0;
      const preference =
        await generate_random_shopping_mall_seller_user_notification_preferences_create(
          firstSellerConnection,
          {
            body: {
              channelName: channel,
              notificationType: type,
              isEnabled: isEnabled,
              sellerId: firstSeller.id,
            },
          },
        );
      typia.assert(preference);
      firstSellerPreferences.push(preference);
    }
  }
  // Step 4: Create a subset of preferences for second seller to test isolation
  const secondSellerPreference1 =
    await generate_random_shopping_mall_seller_user_notification_preferences_create(
      secondSellerConnection,
      {
        body: {
          channelName: "email",
          notificationType: "order_update",
          isEnabled: true,
          sellerId: secondSeller.id,
        },
      },
    );
  typia.assert(secondSellerPreference1);
  const secondSellerPreference2 =
    await generate_random_shopping_mall_seller_user_notification_preferences_create(
      secondSellerConnection,
      {
        body: {
          channelName: "push",
          notificationType: "system_alert",
          isEnabled: false,
          sellerId: secondSeller.id,
        },
      },
    );
  typia.assert(secondSellerPreference2);
  // Step 5: Validate toggling effect and isolation
  // Toggle an existing preference for first seller and check updated flag
  const togglePreferenceBody = {
    channelName: firstSellerPreferences[0].channelName,
    notificationType: firstSellerPreferences[0].notificationType,
    isEnabled: !firstSellerPreferences[0].isEnabled,
    sellerId: firstSeller.id,
  } satisfies IShoppingMallUserNotificationPreference.ICreate;
  const toggledPreference =
    await generate_random_shopping_mall_seller_user_notification_preferences_create(
      firstSellerConnection,
      { body: togglePreferenceBody },
    );
  typia.assert(toggledPreference);
  // Validate toggled value different from original
  TestValidator.notEquals(
    "toggled preference is different",
    toggledPreference.isEnabled,
    firstSellerPreferences[0].isEnabled,
  );
  // Validate second seller preferences remain unchanged
  TestValidator.equals(
    "second seller first preference channel",
    secondSellerPreference1.channelName,
    "email",
  );
  TestValidator.equals(
    "second seller first preference notification type",
    secondSellerPreference1.notificationType,
    "order_update",
  );
  TestValidator.equals(
    "second seller first preference is enabled",
    secondSellerPreference1.isEnabled,
    true,
  );
  TestValidator.equals(
    "second seller second preference channel",
    secondSellerPreference2.channelName,
    "push",
  );
  TestValidator.equals(
    "second seller second preference notification type",
    secondSellerPreference2.notificationType,
    "system_alert",
  );
  TestValidator.equals(
    "second seller second preference is enabled",
    secondSellerPreference2.isEnabled,
    false,
  );
  // Step 6: Create multiple preferences concurrently for first seller
  // and check creation and data integrity
  const bulkPreferences = await Promise.all(
    channels.map(async (channel) => {
      return await generate_random_shopping_mall_seller_user_notification_preferences_create(
        firstSellerConnection,
        {
          body: {
            channelName: channel,
            notificationType: "promotion",
            isEnabled: true,
            sellerId: firstSeller.id,
          },
        },
      );
    }),
  );
  bulkPreferences.forEach((preference, index) => {
    typia.assert(preference);
    TestValidator.equals(
      `bulk preference channel ${index}`,
      preference.channelName,
      channels[index],
    );
    TestValidator.equals(
      `bulk preference notification type ${index}`,
      preference.notificationType,
      "promotion",
    );
    TestValidator.predicate(
      `bulk preference is enabled ${index}`,
      preference.isEnabled === true,
    );
  });
}
