import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful authentication with valid email and password credentials.
 * Verifies existing users can access their accounts with correct credentials,
 * receiving fresh JWT tokens for authenticated API access. Validates proper
 * credential validation, token generation, and session establishment for
 * ongoing application usage.
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Step 1: Create a test user account (dependency)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const href = `https://todo-app.example.com/login`;
  const referrer = `https://todo-app.example.com/register`;

  const joinInput = {
    body: {
      email: email,
      password: password,
      href: href,
      referrer: referrer,
    } satisfies ITodoAppUser.IJoin,
  };

  const joinedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, joinInput);
  typia.assert(joinedUser);

  // Step 2: Login with the same credentials to test validation
  const loginInput = {
    body: {
      email: email,
      password: password,
      href: href,
      referrer: referrer,
      ip: "127.0.0.1",
    } satisfies ITodoAppUser.ILogin,
  };

  const authorizedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, loginInput);
  typia.assert(authorizedUser);

  // Step 3: Validate login success with comprehensive assertion
  TestValidator.equals(
    "user ID matches between join and login",
    authorizedUser.id,
    joinedUser.id,
  );
  TestValidator.equals("user email matches", authorizedUser.email, email);
  TestValidator.predicate(
    "user has valid ID format",
    authorizedUser.id.length > 0,
  );
  TestValidator.predicate(
    "user email is provided",
    authorizedUser.email.length > 0,
  );
  TestValidator.predicate(
    "user created timestamp exists",
    authorizedUser.created_at.length > 0,
  );

  // Step 4: Validate authentication token
  const token = authorizedUser.token;
  TestValidator.predicate(
    "authentication token exists",
    token.access.length > 0,
  );
  TestValidator.predicate("refresh token exists", token.refresh.length > 0);
  TestValidator.predicate(
    "access token expiration exists",
    token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration exists",
    token.refreshable_until.length > 0,
  );

  // Step 5: Validate token structures and formats
  typia.assert(token);
  const tokenValidation = typia.validate(token);
  TestValidator.predicate("token validation success", tokenValidation.success);

  // Step 6: Test that connection headers are properly set for authorization
  TestValidator.predicate(
    "authorization header set",
    connection.headers != null,
  );
  TestValidator.predicate(
    "authorization token present",
    connection.headers?.Authorization === token.access,
  );

  // Step 7: Verify user can perform operations with valid login credentials
  TestValidator.predicate(
    "user status verified",
    authorizedUser.deleted_at === undefined,
  );

  // Step 8: Test edge case - failed authentication (wrong credentials)
  await TestValidator.error("login with wrong password fails", async () => {
    await api.functional.auth.user.login(connection, {
      body: {
        email: email,
        password: "wrong_password_123456",
        href: href,
        referrer: referrer,
      } satisfies ITodoAppUser.ILogin,
    });
  });
}
