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

export async function test_api_administrator_user_notification_preferences_multiple_owners_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and register to get authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = typia.random<IShoppingMallAdministrator.IJoin>();
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = { Authorization: authorized.token.access };
  // Prepare invalid notification preference body with multiple owners
  const invalidBody = {
    administratorId: typia.random<string & typia.tags.Format<"uuid">>(),
    sellerId: typia.random<string & typia.tags.Format<"uuid">>(),
    channelName: "email",
    notificationType: "promotion",
    isEnabled: true,
  } satisfies IShoppingMallUserNotificationPreference.ICreate;
  // Attempt to create preference and expect an error
  await TestValidator.error(
    "should reject preference creation with multiple ownership identifiers",
    async () => {
      await api.functional.shoppingMall.administrator.userNotificationPreferences.createUserNotificationPreference(
        adminConnection,
        { body: invalidBody },
      );
    },
  );
}
