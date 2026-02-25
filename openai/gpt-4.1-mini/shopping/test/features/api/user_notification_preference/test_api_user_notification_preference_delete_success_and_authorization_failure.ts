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
import { generate_random_shopping_mall_administrator_user_notification_preferences_create } from "../../../generate/generate_random_shopping_mall_administrator_user_notification_preferences_create";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_user_notification_preference_delete_success_and_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a user notification preference by an authorized administrator.
  {
    const adminConnection: api.IConnection = { host: connection.host };
    // Administrator joins the platform
    const administrator = await authorize_administrator_join(adminConnection, {
      body: {
        email: `admin_${typia.random<string & tags.Format<"email">>()}`,
        password: "StrongPass123",
      },
    });
    typia.assert(administrator);
    adminConnection.headers = { Authorization: administrator.token.access };
    // Administrator creates a new user notification preference
    const createdPreference =
      await generate_random_shopping_mall_administrator_user_notification_preferences_create(
        adminConnection,
        {
          body: {
            administratorId: administrator.id,
            channelName: "email",
            notificationType: "system_alert",
            isEnabled: true,
          },
        },
      );
    typia.assert(createdPreference);
    // Administrator deletes the created preference
    await api.functional.shoppingMall.administrator.userNotificationPreferences.eraseUserNotificationPreference(
      adminConnection,
      {
        preferenceId: createdPreference.id,
      },
    );
    // Validate the deletion by trying to fetch the deleted preference (should fail with 404)
    // Workaround: Use second delete attempt because GET /userNotificationPreferences/{preferenceId} endpoint does not exist
    await TestValidator.httpError(
      "fail to get deleted preference",
      404,
      async () => {
        await api.functional.shoppingMall.administrator.userNotificationPreferences.eraseUserNotificationPreference(
          adminConnection,
          { preferenceId: createdPreference.id },
        );
      },
    );
  }
  // Scenario 2: Failed deletion attempt by an unauthorized administrator due to non-existent preferenceId or lacking ownership.
  {
    const adminConnection: api.IConnection = { host: connection.host };
    // Administrator joins the platform
    const administrator = await authorize_administrator_join(adminConnection, {
      body: {
        email: `admin_${typia.random<string & tags.Format<"email">>()}`,
        password: "StrongPass123",
      },
    });
    typia.assert(administrator);
    adminConnection.headers = { Authorization: administrator.token.access };
    // Attempt to delete a non-existent preferenceId
    await TestValidator.httpError(
      "delete non-existent preferenceId",
      [403, 404],
      async () => {
        await api.functional.shoppingMall.administrator.userNotificationPreferences.eraseUserNotificationPreference(
          adminConnection,
          {
            preferenceId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );
  }
}
