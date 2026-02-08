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

export async function test_api_seller_notification_preferences_bulk_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller to get authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // As IShoppingMallSeller.IJoin has no properties, sending empty body
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Update sellerConnection to include authorization header with the access token
  sellerConnection.headers = {
    ...(sellerConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Initial set of notification preferences (bulk insert)
  // Prepare multiple preferences with varied channels and types
  const initialPreferences = [
    { channel_name: "email", notification_type: "order", is_enabled: true },
    { channel_name: "sms", notification_type: "order", is_enabled: false },
    { channel_name: "push", notification_type: "promotion", is_enabled: true },
  ];
  // 3. Send initial bulk update
  const response1 =
    await api.functional.shoppingMall.seller.notifications.preferences.updatePreferences(
      sellerConnection,
      {
        body: initialPreferences,
      },
    );
  typia.assert(response1);
  // 4. Validate the response reflects initial preferences
  // Convert response array to map key=(channel_name+notification_type) for easy validation
  const map1 = new Map();
  for (const pref of response1 as any) {
    const key = `${pref.channel_name}-${pref.notification_type}`;
    map1.set(key, pref);
  }
  for (const pref of initialPreferences) {
    const key = `${pref.channel_name}-${pref.notification_type}`;
    const saved = map1.get(key);
    TestValidator.predicate(
      `Preference set ${key}`,
      saved !== undefined && saved.is_enabled === pref.is_enabled,
    );
  }
  // 5. Update preferences with partial overlap and new entry
  const updatePreferences = [
    { channel_name: "email", notification_type: "order", is_enabled: false }, // flip
    { channel_name: "sms", notification_type: "order", is_enabled: true }, // flip
    { channel_name: "push", notification_type: "review", is_enabled: true }, // new type for push
  ];
  const response2 =
    await api.functional.shoppingMall.seller.notifications.preferences.updatePreferences(
      sellerConnection,
      {
        body: updatePreferences,
      },
    );
  typia.assert(response2);
  // 6. Validate updated preferences reflect correctly
  const map2 = new Map();
  for (const pref of response2 as any) {
    const key = `${pref.channel_name}-${pref.notification_type}`;
    map2.set(key, pref);
  }
  for (const pref of updatePreferences) {
    const key = `${pref.channel_name}-${pref.notification_type}`;
    const saved = map2.get(key);
    TestValidator.predicate(
      `Preference updated ${key}`,
      saved !== undefined && saved.is_enabled === pref.is_enabled,
    );
  }
  // 7. Validate that the preferences not included remain unchanged
  // e.g. initial "push-promotion" preference should exist unchanged
  const unchangedKey = "push-promotion";
  TestValidator.predicate(
    `Preference unchanged ${unchangedKey}`,
    map2.has(unchangedKey) && map2.get(unchangedKey).is_enabled === true,
  );
  // 8. Validate unauthorized access is forbidden
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "Unauthorized update",
    401,
    async () =>
      await api.functional.shoppingMall.seller.notifications.preferences.updatePreferences(
        unauthConnection,
        { body: updatePreferences },
      ),
  );
  // 9. Assume audit logging and atomicity indirectly tested by system - no direct verification
}
