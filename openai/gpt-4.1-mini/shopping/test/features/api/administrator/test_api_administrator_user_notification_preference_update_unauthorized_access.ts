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

export async function test_api_administrator_user_notification_preference_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies proper authorization enforcement when updating user notification preferences.
  // 1. Prepare two administrator accounts.
  // 2. Assume or create a user notification preference owned by the first administrator.
  // 3. Attempt to update from the second administrator's context.
  // 4. Validate that update is rejected with authorization error.
  // 1. Create first administrator and obtain authorized connection
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstJoinBody = typia.random<IShoppingMallAdministrator.IJoin>();
  const firstAdminAuthorized = await authorize_administrator_join(connection, {
    body: firstJoinBody,
  });
  firstAdminConnection.headers = {
    Authorization: `Bearer ${firstAdminAuthorized.token.access}`,
  };
  // 2. Create second administrator and obtain authorized connection
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondJoinBody = typia.random<IShoppingMallAdministrator.IJoin>();
  const secondAdminAuthorized = await authorize_administrator_join(connection, {
    body: secondJoinBody,
  });
  secondAdminConnection.headers = {
    Authorization: `Bearer ${secondAdminAuthorized.token.access}`,
  };
  // 3. Create a user notification preference owned by first administrator.
  // Since there is no utility or SDK function given to create a preference
  // (and it can't be created via update endpoint), this step assumes a user
  // notification preference exists. For testing unauthorized update, we
  // simulate with a UUID. In a real test, a preference should be created and
  // owned by firstAdmin. For this challenge, we will generate a random valid
  // UUID representing the existing preference.
  // Generate random UUID for userNotificationPreferenceId to represent owned preference.
  const userNotificationPreferenceId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Prepare update body with random valid update data
  const updateBody =
    typia.random<IShoppingMallUserNotificationPreference.IUpdate>();
  // 4. Attempt update from second administrator - should fail authorization
  await TestValidator.httpError(
    "unauthorized update from second administrator",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.userNotificationPreferences.update(
        secondAdminConnection,
        {
          userNotificationPreferenceId: userNotificationPreferenceId,
          body: updateBody,
        },
      );
    },
  );
}
