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

export async function test_api_administrator_notifications_preferences_update_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test bulk update with empty list for an administrator user notification preferences
  // 1. Administrator Join and Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  // 2. Send bulk update request with empty preferences list
  const updateResponse =
    await api.functional.shoppingMall.administrator.notifications.preferences.updatePreferences(
      adminConnection,
      {
        body: [] satisfies IShoppingMallUserNotificationPreference.IUpdateMany,
      },
    );
  typia.assert(updateResponse);
  // 3. Validate that response is empty, meaning no preferences set
  TestValidator.predicate(
    "response shows no preferences",
    Array.isArray(updateResponse) && updateResponse.length === 0,
  );
}
