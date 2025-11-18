import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user login with valid credentials.
 *
 * This E2E test validates the complete authentication workflow by first
 * creating a user account and then testing login functionality. It verifies
 * password comparison against stored hash, proper JWT token generation, and
 * account status validation that allows 'pending_verification' accounts to
 * authenticate.
 *
 * The test ensures that the login endpoint correctly handles session context
 * information and returns comprehensive user data with authentication tokens.
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Step 1: Create a user account for login testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";
  const userName = RandomGenerator.name();

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: userName,
      status: "pending_verification",
      href: "https://todoapp.com/login" satisfies string as string,
      referrer: "https://todoapp.com/" satisfies string as string,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Test successful login with valid credentials
  const loginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://todoapp.com/dashboard" satisfies string as string,
      referrer: "https://todoapp.com/login" satisfies string as string,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Validate login response structure and data
  TestValidator.equals(
    "user ID should match created user",
    loginResponse.id,
    createdUser.id,
  );
  TestValidator.equals(
    "user email should match",
    loginResponse.email,
    userEmail,
  );
  TestValidator.equals("user name should match", loginResponse.name, userName);
  TestValidator.equals(
    "user status should be pending_verification",
    loginResponse.status,
    "pending_verification",
  );

  // Step 4: Validate token generation
  TestValidator.predicate(
    "access token should be generated",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be generated",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be valid",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration should be valid",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );

  // Step 5: Validate timestamps
  TestValidator.predicate(
    "created_at timestamp should be valid",
    new Date(loginResponse.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid",
    new Date(loginResponse.updated_at) <= new Date(),
  );

  // Step 6: Validate last_login_at is updated (should be more recent than created_at)
  if (loginResponse.last_login_at) {
    TestValidator.predicate(
      "last_login_at should be after account creation",
      new Date(loginResponse.last_login_at) >=
        new Date(loginResponse.created_at),
    );
  }
}
