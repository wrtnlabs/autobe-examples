import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create initial admin account to obtain refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(initialAuth);
  // Use the issued refresh token to refresh the session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_refresh(refreshConnection, {
      body: {
        refresh_token: initialAuth.refresh_token,
      } satisfies IShoppingMallAdmin.IRefresh,
    });
  typia.assert(refreshedAuth);
  // Verify that the new tokens are different from the old ones
  TestValidator.notEquals(
    "new access token differs from old",
    initialAuth.access_token,
    refreshedAuth.access_token,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    initialAuth.refresh_token,
    refreshedAuth.refresh_token,
  );
  TestValidator.equals(
    "admin_id remains the same",
    initialAuth.admin_id,
    refreshedAuth.admin_id,
  );
  // Verify that the old refresh token no longer works
  const staleRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("old refresh token rejected", 401, async () => {
    await authorize_admin_refresh(staleRefreshConnection, {
      body: {
        refresh_token: initialAuth.refresh_token,
      } satisfies IShoppingMallAdmin.IRefresh,
    });
  });
}
