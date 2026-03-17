import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator account
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(joinConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials using a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_admin_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallSuperAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate business logic
  TestValidator.equals("email matches registration", loginResult.email, email);
  TestValidator.equals(
    "account is active (deleted_at is null)",
    loginResult.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token is non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResult.token.refresh.length > 0,
  );
  // 4. Verify a new session was issued (tokens differ from join tokens)
  TestValidator.notEquals(
    "login access token differs from join access token",
    loginResult.token.access,
    joinResult.token.access,
  );
}
