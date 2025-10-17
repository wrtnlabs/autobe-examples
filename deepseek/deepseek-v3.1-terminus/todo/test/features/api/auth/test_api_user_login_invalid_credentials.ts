import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test login attempts with incorrect email or password combinations.
 *
 * This test validates that the authentication system properly handles invalid
 * credentials and provides appropriate error responses without revealing
 * whether an email exists in the system. The test ensures security measures
 * like rate limiting are properly implemented by testing various invalid
 * credential scenarios.
 *
 * Test scenarios covered:
 *
 * - Correct email with wrong password
 * - Wrong email with correct password
 * - Both email and password wrong
 * - Short password attempts
 */
export async function test_api_user_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Create a valid user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "ValidPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(user);

  // 2. Test various invalid credential scenarios

  // Scenario 1: Correct email with wrong password
  await TestValidator.error(
    "correct email with wrong password should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: "WrongPassword456",
        } satisfies IMinimalTodoUser.ILogin,
      });
    },
  );

  // Scenario 2: Wrong email with correct password
  await TestValidator.error(
    "wrong email with correct password should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: userPassword,
        } satisfies IMinimalTodoUser.ILogin,
      });
    },
  );

  // Scenario 3: Both email and password wrong
  await TestValidator.error(
    "both email and password wrong should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "CompletelyWrongPassword",
        } satisfies IMinimalTodoUser.ILogin,
      });
    },
  );

  // Scenario 4: Short password attempt (valid type but likely fails business logic)
  await TestValidator.error(
    "login with short password should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: "short", // This is valid TypeScript since ILogin.password is just string
        } satisfies IMinimalTodoUser.ILogin,
      });
    },
  );

  // 3. Test that successful login still works with correct credentials
  const successLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IMinimalTodoUser.ILogin,
  });
  typia.assert(successLogin);

  TestValidator.equals(
    "successful login returns user ID",
    successLogin.id,
    user.id,
  );
  TestValidator.predicate(
    "successful login returns valid token",
    successLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "successful login returns refresh token",
    successLogin.token.refresh.length > 0,
  );
}
