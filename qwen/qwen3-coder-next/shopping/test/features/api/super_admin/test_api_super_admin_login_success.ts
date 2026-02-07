import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create verified super admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.shoppingMall.auth.super_admin.join(
    adminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(joinResult);
  // 2. Login with the newly created super admin account
  const loginResult = await api.functional.shoppingMall.auth.super_admin.login(
    adminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
    },
  );
  typia.assert(loginResult);
  // 3. Verify authentication response structure
  TestValidator.predicate(
    "access token exists",
    () =>
      loginResult.token.access !== "" && loginResult.token.access !== undefined,
  );
  TestValidator.predicate(
    "refresh token exists",
    () =>
      loginResult.token.refresh !== "" &&
      loginResult.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "expiration timestamp is valid",
    () =>
      loginResult.token.expired_at !== undefined &&
      loginResult.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refreshable until timestamp is valid",
    () =>
      loginResult.token.refreshable_until !== undefined &&
      loginResult.token.refreshable_until !== null,
  );
  // 4. Verify token expiration timestamps are valid ISO date-time strings
  TestValidator.predicate("access token expiration format", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loginResult.token.expired_at,
    ),
  );
  TestValidator.predicate("refresh token expiration format", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loginResult.token.refreshable_until,
    ),
  );
}
