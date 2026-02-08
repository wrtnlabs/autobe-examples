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

export async function test_api_seller_notification_preferences_empty_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration (join) and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // Update the connection headers with authorization token
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare empty notification preferences update payload
  const emptyPreferences: IShoppingMallUserNotificationPreference.IUpdateMany = [];
  // 3. Call update preferences endpoint with empty list
  const firstUpdateRaw = await api.functional.shoppingMall.seller.notifications.preferences.updatePreferences(
    sellerConnection,
    { body: emptyPreferences },
  );
  const firstUpdate = typia.assert<Array<IShoppingMallUserNotificationPreference>>(firstUpdateRaw);
  // 4. Call update preferences endpoint again with empty list to test idempotency
  const secondUpdateRaw = await api.functional.shoppingMall.seller.notifications.preferences.updatePreferences(
    sellerConnection,
    { body: emptyPreferences },
  );
  const secondUpdate = typia.assert<Array<IShoppingMallUserNotificationPreference>>(secondUpdateRaw);
  // 5. Validate that both responses are equal (idempotent behavior)
  TestValidator.equals(
    "first and second update responses should be equal",
    firstUpdate,
    secondUpdate,
  );
  // 6. Optionally validate the structure and content of the preferences
  // Since it's an update with empty list, we expect either empty array or
  // valid preference structure without duplicates
  TestValidator.predicate(
    "preferences should have no duplicates",
    (() => {
      const seen = new Set<string>();
      for (const pref of firstUpdate) {
        const key = JSON.stringify(pref);
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    })(),
  );
}
