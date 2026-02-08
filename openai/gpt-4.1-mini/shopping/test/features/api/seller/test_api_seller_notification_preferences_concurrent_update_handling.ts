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

export async function test_api_seller_notification_preferences_concurrent_update_handling(
  connection: api.IConnection,
): Promise<void> {
  // This scenario validates concurrent update handling for seller notification preferences.
  // It simulates two simultaneous bulk update requests from the same seller with overlapping and conflicting preference settings.
  // The test verifies that the system correctly handles concurrency with transaction isolation or retries, maintaining data integrity and returning consistent, conflict-free updated preferences.
  // 1. Seller registration and authorization
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // 2. Prepare initial preference bulk update
  // Use realistic channel_name, notification_type and is_enabled values
  // Because IShoppingMallUserNotificationPreference.IUpdateMany schema details are not provided,
  // assume array of objects with required fields channel_name, notification_type and is_enabled
  const preferenceA = [
    {
      channel_name: "email",
      notification_type: "order_shipped",
      is_enabled: true,
    },
    {
      channel_name: "sms",
      notification_type: "order_shipped",
      is_enabled: false,
    },
    {
      channel_name: "push",
      notification_type: "promotion",
      is_enabled: true,
    },
  ] satisfies IShoppingMallUserNotificationPreference.IUpdateMany;
  const preferenceB = [
    {
      channel_name: "email",
      notification_type: "order_shipped",
      is_enabled: false, // conflicting with preferenceA
    },
    {
      channel_name: "sms",
      notification_type: "promotion",
      is_enabled: true,
    },
    {
      channel_name: "push",
      notification_type: "order_shipped",
      is_enabled: false,
    },
  ] satisfies IShoppingMallUserNotificationPreference.IUpdateMany;
  // 3. Simulate concurrent bulk update operations
  // Run in parallel
  const [resultA, resultB] = await Promise.all([
    api.functional.shoppingMall.seller.notifications.preferences.updatePreferences(
      sellerConnection,
      { body: preferenceA },
    ),
    api.functional.shoppingMall.seller.notifications.preferences.updatePreferences(
      sellerConnection,
      { body: preferenceB },
    ),
  ]);
  // 4. Assert that returned preferences are valid
  typia.assert(resultA);
  typia.assert(resultB);
  // 5. The final result must have consistent, conflict-free preferences
  // Because concurrency may update in any order, resultA or resultB may be last
  // Check that no conflicting duplicate preference exists in the merged result
  // Merge both results, entries indexed by channel_name + notification_type
  const map = new Map<string, boolean>();
  const mergeAndCheck = (prefs: IShoppingMallUserNotificationPreference) => {
    for (const pref of prefs as any[]) {
      const key = `${pref.channel_name}::${pref.notification_type}`;
      if (map.has(key)) {
        // Check that is_enabled is consistent
        TestValidator.equals(
          `conflict check for ${key}`,
          map.get(key),
          pref.is_enabled,
        );
      } else {
        map.set(key, pref.is_enabled);
      }
    }
  };
  mergeAndCheck(resultA);
  mergeAndCheck(resultB);
}
