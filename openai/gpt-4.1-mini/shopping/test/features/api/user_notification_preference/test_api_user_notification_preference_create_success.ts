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

export async function test_api_user_notification_preference_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication by join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!",
    },
  });
  // 2. Prepare creation body for user notification preference,
  // include administratorId as ownership
  const body: IShoppingMallUserNotificationPreference.ICreate = {
    channelName: "email",
    notificationType: "promotion",
    isEnabled: true,
    administratorId: admin.id,
  };
  // 3. Call the create endpoint via utility function
  const preference =
    await generate_random_shopping_mall_administrator_user_notification_preferences_create(
      adminConnection,
      { body },
    );
  // 4. Validate response
  typia.assert(preference);
  TestValidator.equals(
    "channel name matches",
    preference.channelName,
    body.channelName,
  );
  TestValidator.equals(
    "notification type matches",
    preference.notificationType,
    body.notificationType,
  );
  TestValidator.equals(
    "is enabled matches",
    preference.isEnabled,
    body.isEnabled,
  );
  TestValidator.equals(
    "administratorId matches",
    preference.administratorId,
    admin.id,
  );
  TestValidator.predicate(
    "id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      preference.id,
    ),
  );
  TestValidator.predicate(
    "createdAt is date-time",
    !isNaN(Date.parse(preference.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is date-time",
    !isNaN(Date.parse(preference.updatedAt)),
  );
}
