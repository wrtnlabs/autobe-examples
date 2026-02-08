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

export async function test_api_administrator_user_notification_preference_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator account creation and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = typia.random<IShoppingMallAdministrator.IJoin>();
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare userNotificationPreferenceId (simulate existing UUID)
  const userNotificationPreferenceId = typia.random<
    string & import("typia").tags.Format<"uuid">
  >();
  // 3. Prepare empty update body as IUpdate is empty in definitions
  const updateBody =
    {} satisfies IShoppingMallUserNotificationPreference.IUpdate;
  // 4. Call update endpoint
  const updatedPreference =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.update(
      adminConnection,
      {
        userNotificationPreferenceId,
        body: updateBody,
      },
    );
  typia.assert(updatedPreference);
  // 5. No other checks possible since no properties in IShoppingMallUserNotificationPreference.IUpdate
  // Ownership enforcement, audit logs, transaction atomicity assumed handled by backend
}
