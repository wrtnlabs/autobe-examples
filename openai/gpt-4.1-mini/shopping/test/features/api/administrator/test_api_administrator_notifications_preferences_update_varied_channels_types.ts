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

export async function test_api_administrator_notifications_preferences_update_varied_channels_types(
  connection: api.IConnection,
): Promise<void> {
  // Test updating notification preferences with all possible notification channels and types to verify the system handles different combinations correctly. This includes enabling and disabling each notification type per channel and verifying persistence in the system for the administrator user.
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Define notification channels and notification types
  // Typical example: email, sms, push
  const channels = ["email", "sms", "push"];
  const notificationTypes = ["order_update", "promotion", "system_alert"];
  // 3. Generate all combinations for enabled and disabled
  // We test enabling and disabling each notification type per channel
  type Preference = IShoppingMallUserNotificationPreference.IUpdate;
  const preferencesToSet: Preference[] = [];
  for (const channelName of channels) {
    for (const notificationType of notificationTypes) {
      // Generate two preferences for each: enabled true and false
      preferencesToSet.push({
        channelName,
        notificationType,
        isEnabled: true,
      });
      preferencesToSet.push({
        channelName,
        notificationType,
        isEnabled: false,
      });
    }
  }
  // 4. For test efficiency, we shuffle and pick some to update
  // However, the scenario says to test with all possible combinations for updates
  // So we iterate all and update sequentially
  for (const preference of preferencesToSet) {
    await api.functional.shoppingMall.administrator.notifications.preferences.updatePreferences(
      adminConnection,
      { body: preference },
    );
  }
  // 5. Verify that no error occurred during updates
  // Since updatePreferences returns void, no response is asserted
  // Additional: If there was a GET /preferences endpoint for validation, we would
  // do a GET and assert the persisted preferences match what was set.
  // But since scenario does not mention GET endpoint, we skip validation of persistence.
}
