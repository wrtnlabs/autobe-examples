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

/**
 * Test super administrator login session management behavior.
 *
 * This test validates the session lifecycle management for super administrator accounts:
 * 1. Creates a super administrator account
 * 2. Performs initial login to establish a session
 * 3. Performs a second login with the same credentials
 * 4. Verifies that new tokens are generated for the second login
 * 5. Validates account information consistency across logins
 *
 * This ensures that when a super administrator logs in, a new session is created
 * with fresh tokens, properly managing the session lifecycle.
 */
export async function test_api_super_admin_login_session_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdmin.IJoin;
  const joinResult = await authorize_super_admin_join(connection, {
    body: joinCredentials,
  });
  typia.assert(joinResult);
  // 2. Prepare login credentials using the same email/password
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdmin.ILogin;
  // 3. First login - establish initial session
  const firstLoginConnection: api.IConnection = { host: connection.host };
  const firstLoginResult = await authorize_super_admin_login(
    firstLoginConnection,
    {
      body: loginCredentials,
    },
  );
  typia.assert(firstLoginResult);
  // 4. Second login - test session lifecycle (should create new session)
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const secondLoginResult = await authorize_super_admin_login(
    secondLoginConnection,
    {
      body: loginCredentials,
    },
  );
  typia.assert(secondLoginResult);
  // 5. Verify account information is consistent
  TestValidator.equals(
    "super admin id matches",
    joinResult.id,
    firstLoginResult.id,
  );
  TestValidator.equals(
    "super admin id matches second login",
    joinResult.id,
    secondLoginResult.id,
  );
  TestValidator.equals(
    "email matches",
    joinResult.email,
    firstLoginResult.email,
  );
  TestValidator.equals(
    "email matches second login",
    joinResult.email,
    secondLoginResult.email,
  );
  // 6. Verify tokens are different between logins (new session created)
  TestValidator.notEquals(
    "access token differs",
    firstLoginResult.token.access,
    secondLoginResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token differs",
    firstLoginResult.token.refresh,
    secondLoginResult.token.refresh,
  );
}
