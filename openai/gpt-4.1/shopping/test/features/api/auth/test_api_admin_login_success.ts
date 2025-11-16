import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * E2E test for admin login with valid credentials.
 *
 * 1. Create a valid admin account using API (admin join)
 * 2. Log in using the same email and password
 * 3. Assert the login response is successful and provides a valid access/refresh
 *    token, correct UUID, email, name
 * 4. Assert email verification and status are correct
 * 5. Assert all fields in IShoppingMallAdmin.IAuthorized are present
 * 6. Assert join and login responses are identical except for the JWT token
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const name = RandomGenerator.name();
  const joinBody = {
    email,
    password,
    name,
  } satisfies IShoppingMallAdmin.ICreate;
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);

  // 2. Login with registered credentials
  const loginBody = { email, password } satisfies IShoppingMallAdmin.ILogin;
  const loginResult = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // 3. Assert response properties match those set at registration (excluding token)
  TestValidator.equals(
    "admin id matches after login",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "admin email matches after login",
    loginResult.email,
    email,
  );
  TestValidator.equals(
    "admin name matches after login",
    loginResult.name,
    name,
  );
  TestValidator.equals(
    "admin status matches after login",
    loginResult.status,
    joinResult.status,
  );
  TestValidator.equals(
    "admin is_email_verified matches after login",
    loginResult.is_email_verified,
    joinResult.is_email_verified,
  );
  TestValidator.equals(
    "admin created_at matches after login",
    loginResult.created_at,
    joinResult.created_at,
  );
  TestValidator.equals(
    "admin updated_at matches after login",
    loginResult.updated_at,
    joinResult.updated_at,
  );

  // 4. Assert both login and join return a token structure
  typia.assert<IAuthorizationToken>(loginResult.token);
  typia.assert<IAuthorizationToken>(joinResult.token);

  // 5. Assert tokens differ (login returns a new token set)
  TestValidator.notEquals(
    "login and join access tokens must differ",
    loginResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "login and join refresh tokens must differ",
    loginResult.token.refresh,
    joinResult.token.refresh,
  );
}
