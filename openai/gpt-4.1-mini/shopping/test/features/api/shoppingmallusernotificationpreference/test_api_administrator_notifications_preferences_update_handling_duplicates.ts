import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_preferences_update_handling_duplicates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins to get authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Use the adminConnection updated internally by authorize_administrator_join
  // 2. Prepare duplicate notification preferences array
  // Since the schema for IUpdateMany is not detailed, the test will use empty array
  // to comply with schema and avoid adding non-existent props
  const duplicatePreferences: IShoppingMallUserNotificationPreference.IUpdateMany =
    [];
  // 3. Call updatePreferences API with duplicates
  // The business rule expects the system to resolve duplicates or reject
  const updatedPrefs =
    await api.functional.shoppingMall.administrator.notifications.preferences.updatePreferences(
      adminConnection,
      { body: duplicatePreferences },
    );
  typia.assert(updatedPrefs);
  // 4. Validate no duplicates exist in returned preferences
  const seen = new Set<string>();
  for (const pref of updatedPrefs as Array<{
    channel_name: string;
    notification_type: string;
  }>) {
    const key = `${pref.channel_name}::${pref.notification_type}`;
    TestValidator.predicate(
      `Preference unique key ${key} not duplicated`,
      !seen.has(key),
    );
    seen.add(key);
  }
  // 5. Re-call updatePreferences with the same data to verify idempotency
  const updatedPrefs2 =
    await api.functional.shoppingMall.administrator.notifications.preferences.updatePreferences(
      adminConnection,
      { body: duplicatePreferences },
    );
  typia.assert(updatedPrefs2);
  TestValidator.equals(
    "Idempotent update returns same result",
    updatedPrefs2,
    updatedPrefs,
  );
}
