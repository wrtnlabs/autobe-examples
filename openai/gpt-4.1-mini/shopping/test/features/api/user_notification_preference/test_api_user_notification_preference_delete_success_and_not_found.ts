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

export async function test_api_user_notification_preference_delete_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a user notification preference by an administrator.
  // Scenario 2: Attempt to delete a non-existing user notification preference.
  // 1. Admin authentication - create a new connection and authenticate
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(administratorConnection, {
      body: {} satisfies IShoppingMallAdministrator.IJoin,
    });
  // Set Authorization header
  administratorConnection.headers = {
    ...administratorConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a user notification preference resource
  const createdPreference: IShoppingMallUserNotificationPreference =
    await generate_random_shopping_mall_administrator_user_notification_preferences_create_user_notification_preference(
      administratorConnection,
      {},
    );
  typia.assert(createdPreference);
  // 3. Delete the created user notification preference
  await api.functional.shoppingMall.administrator.userNotificationPreferences.erase(
    administratorConnection,
    { userNotificationPreferenceId: typia.assert<string & tags.Format<"uuid">>((createdPreference as unknown as { id: string }).id) },
  );
  // 4. Attempt to delete a non-existing user notification preference
  // Use a random UUID that likely does not exist
  const randomUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existing user notification preference returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.userNotificationPreferences.erase(
        administratorConnection,
        { userNotificationPreferenceId: randomUUID },
      ),
  );
}
