import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: { email, password },
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials using a fresh connection
  const loginConnection1: api.IConnection = { host: connection.host };
  const loginResult1 = await authorize_admin_login(loginConnection1, {
    body: { email, password } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginResult1);
  // 3. Validate business logic: email matches, deleted_at is null
  TestValidator.equals(
    "admin email matches join email",
    loginResult1.email,
    email,
  );
  TestValidator.equals(
    "admin account is active (deleted_at is null)",
    loginResult1.deleted_at,
    null,
  );
  // Validate token fields are non-empty
  TestValidator.predicate(
    "access token is non-empty",
    loginResult1.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResult1.token.refresh.length > 0,
  );
  // 4. Login a second time to verify multi-session support (different access token)
  const loginConnection2: api.IConnection = { host: connection.host };
  const loginResult2 = await authorize_admin_login(loginConnection2, {
    body: { email, password } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginResult2);
  // Verify a different access token is returned (independent sessions)
  TestValidator.notEquals(
    "second login produces a different access token",
    loginResult1.token.access,
    loginResult2.token.access,
  );
}
