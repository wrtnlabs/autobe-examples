import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_preferences_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  typia.assert(adminAuthorized);
  // adminConnection is reused with updated headers
  // 2. Prepare multiple different notification preferences
  const preferences: IShoppingMallUserNotificationPreference.IUpdate[] = [
    { channelName: "email", notificationType: "order_update", isEnabled: true },
    { channelName: "sms", notificationType: "promotion", isEnabled: false },
    { channelName: "push", notificationType: "system_alert", isEnabled: true },
  ];
  // 3. Update each preference and validate no content response (void)
  for (const pref of preferences) {
    await api.functional.shoppingMall.administrator.notifications.preferences.updatePreferences(
      adminConnection,
      { body: pref },
    );
  }
  // 4. Try unauthorized update with base connection
  await TestValidator.httpError(
    "unauthorized update attempt",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.notifications.preferences.updatePreferences(
        connection,
        { body: preferences[0] },
      );
    },
  );
}
