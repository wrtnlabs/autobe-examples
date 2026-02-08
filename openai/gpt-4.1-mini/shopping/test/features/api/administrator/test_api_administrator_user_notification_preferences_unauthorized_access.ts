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
import { generate_random_shopping_mall_administrator_user_notification_preferences_create_user_notification_preference } from "../../../generate/generate_random_shopping_mall_administrator_user_notification_preferences_create_user_notification_preference";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_administrator_user_notification_preferences_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that non-administrator roles cannot create or update user notification preferences.
  // 1. Administrator registers (dependency) to have a valid admin connection (not used for the unauthorized request but for completeness)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // 2. Prepare various unauthorized connections (simulating non-admin users):
  // Since we have no utility to create customer or seller authorizations, we simulate unauthorized user by not providing admin token.
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // 3. Prepare a sample user notification preference create body to attempt unauthorized access
  // Note: Since IShoppingMallUserNotificationPreference.ICreate has no defined properties, sending an empty object.
  const body = {} satisfies IShoppingMallUserNotificationPreference.ICreate;
  // 4. Attempt to create or update user notification preference without admin authorization
  await TestValidator.httpError(
    "unauthorized access forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.userNotificationPreferences.createUserNotificationPreference(
        unauthorizedConnection,
        { body },
      );
    },
  );
}
