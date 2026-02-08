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

export async function test_api_administrator_user_notification_preferences_create_update(
  connection: api.IConnection,
): Promise<void> {
  // Scenario Description:
  // Test creation and update of user notification preferences for administrators.
  // Verify authorization restrictions and preference creation/update idempotency.
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  // 2. Create a new user notification preference (administrator-owned)
  // Use generate util to produce a valid create body
  const createBody = {
    ...prepare_random_shopping_mall_user_notification_preference({
      administratorId: typia.random<string & tags.Format<"uuid">>(),
    }),
  } satisfies Partial<IShoppingMallUserNotificationPreference.ICreate>;
  const preference1 =
    await generate_random_shopping_mall_administrator_user_notification_preferences_create_user_notification_preference(
      adminConnection,
      { body: createBody },
    );
  typia.assert(preference1);
  // 3. Re-submit the same preference to check idempotency - use the same create body
  const preference2 =
    await generate_random_shopping_mall_administrator_user_notification_preferences_create_user_notification_preference(
      adminConnection,
      { body: createBody },
    );
  typia.assert(preference2);
  // Validate idempotency by checking ids match
  // We assume IEntity.id exists since preference type extends IEntity
  TestValidator.equals(
    "preference id should match for identical create/update",
    (
      preference1 as {
        id: string;
      }
    ).id,
    (
      preference2 as {
        id: string;
      }
    ).id,
  );
  // 4. Authorization enforcement: create connection without admin token
  const noAuthConnection: api.IConnection = { host: connection.host };
  // Construct an admin-owned create body
  const unauthorizedBody = {
    ...prepare_random_shopping_mall_user_notification_preference({
      administratorId: typia.random<string & tags.Format<"uuid">>(),
    }),
  } satisfies Partial<IShoppingMallUserNotificationPreference.ICreate>;
  // Expect error when non-administrator tries to create
  await TestValidator.error("unauthorized access should throw", async () => {
    await generate_random_shopping_mall_administrator_user_notification_preferences_create_user_notification_preference(
      noAuthConnection,
      { body: unauthorizedBody },
    );
  });
}
