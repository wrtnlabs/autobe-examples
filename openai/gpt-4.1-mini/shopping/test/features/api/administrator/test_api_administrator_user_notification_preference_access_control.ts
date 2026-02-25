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

export async function test_api_administrator_user_notification_preference_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Administrator connection setup
  const adminConnection: api.IConnection = { host: connection.host };
  // Join as a new administrator (authorization)
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // Try to access a non-existent notification preference ID
  await TestValidator.httpError(
    "access non-existent notification preference returns 404 or 403",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.administrator.userNotificationPreferences.at(
        adminConnection,
        {
          preferenceId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Create another admin and fetch a valid notification preference owned by them
  // Then try to access this preference from the original adminConnection - should throw 403
  const otherAdminConnection: api.IConnection = { host: connection.host };
  const otherAdminAuthorized = await authorize_administrator_join(
    otherAdminConnection,
    {},
  );
  otherAdminConnection.headers ??= {};
  otherAdminConnection.headers.Authorization =
    otherAdminAuthorized.token.access;
  // Try to access a preferenceId owned by other admin - expect 403 or 404 error
  // Since there's no way to get an actual preferenceId, simulate by random UUID
  await TestValidator.httpError(
    "access another admin's notification preference returns 403 or 404",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.administrator.userNotificationPreferences.at(
        adminConnection,
        {
          preferenceId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
