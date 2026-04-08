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
 * Test super administrator login authentication flow with error handling for invalid credentials.
 *
 * This test validates the super administrator authentication system by testing both successful login with valid credentials and login failure with invalid credentials. The test ensures that the login endpoint properly authenticates valid users and rejects invalid authentication attempts.
 *
 * Note: The original scenario requested testing login with a soft-deleted account. However, no soft-delete endpoint is available in the provided API functions. This test instead validates the authentication failure path using invalid credentials, which demonstrates the system's ability to reject unauthorized login attempts.
 *
 * 1. Register a new super administrator account with valid credentials using authorize_super_admin_join utility.
 * 2. Store the registration credentials for subsequent login attempts.
 * 3. Attempt login with correct email and password - should succeed and return authorization tokens.
 * 4. Attempt login with incorrect password - should fail with 401 Unauthorized error.
 * 5. Validate that successful login returns proper IAuthorized response with token, id, email, and timestamps.
 * 6. Validate that failed login throws HttpError with appropriate status code.
 */
export async function test_api_super_admin_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IShoppingMallSuperAdmin.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joinResult);
  // 2. Validate join response structure
  TestValidator.equals("email matches", joinResult.email, email);
  TestValidator.predicate(
    "deleted_at is null for active account",
    joinResult.deleted_at === null,
  );
  TestValidator.predicate(
    "has valid access token",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    joinResult.token.refresh.length > 0,
  );
  // 3. Login with correct credentials - should succeed
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdmin.ILogin;
  const loginResult = await authorize_super_admin_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  // 4. Validate successful login response
  TestValidator.equals("login email matches", loginResult.email, email);
  TestValidator.predicate(
    "login deleted_at is null",
    loginResult.deleted_at === null,
  );
  TestValidator.predicate(
    "login has valid access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login has valid refresh token",
    loginResult.token.refresh.length > 0,
  );
  // 5. Login with incorrect password - should fail with 401
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  const wrongPasswordBody = {
    email,
    password: "wrong_password_123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdmin.ILogin;
  await TestValidator.httpError(
    "login with wrong password fails",
    401,
    async () => {
      await authorize_super_admin_login(wrongPasswordConnection, {
        body: wrongPasswordBody,
      });
    },
  );
  // 6. Login with non-existent email - should fail with 401
  const nonExistentConnection: api.IConnection = { host: connection.host };
  const nonExistentBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "some_password_123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdmin.ILogin;
  await TestValidator.httpError(
    "login with non-existent email fails",
    401,
    async () => {
      await authorize_super_admin_login(nonExistentConnection, {
        body: nonExistentBody,
      });
    },
  );
}
