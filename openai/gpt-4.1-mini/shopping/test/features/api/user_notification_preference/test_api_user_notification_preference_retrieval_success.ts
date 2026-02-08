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

export async function test_api_user_notification_preference_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  if (!adminConnection.headers) adminConnection.headers = {};
  adminConnection.headers.Authorization = (authorized.token.access as string);
  // 2. Retrieve the user notification preference via GET with admin auth with random UUID
  const userNotificationPreferenceId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();
  const retrieved =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.at(
      adminConnection,
      {
        userNotificationPreferenceId,
      },
    );
  typia.assert(retrieved);
}
