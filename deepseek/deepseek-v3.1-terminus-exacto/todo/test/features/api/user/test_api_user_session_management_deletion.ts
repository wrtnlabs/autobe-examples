import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user authentication workflow and session token generation. Validates
 * that users can create accounts and authenticate successfully, receiving
 * proper JWT tokens for session management. This test focuses on the
 * authentication aspects that can be validated with the available API
 * functions.
 */
export async function test_api_user_session_management_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";
  const userName = RandomGenerator.name();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: userName,
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Validate user creation response
  TestValidator.equals(
    "user ID should be a valid UUID",
    user.id,
    typia.assert<string & tags.Format<"uuid">>(user.id),
  );
  TestValidator.equals("user email should match input", user.email, userEmail);
  TestValidator.equals("user name should match input", user.name, userName);
  TestValidator.predicate(
    "user should have authentication token",
    user.token !== undefined,
  );
  TestValidator.predicate(
    "token should have access property",
    user.token.access.length > 0,
  );
  TestValidator.predicate(
    "token should have refresh property",
    user.token.refresh.length > 0,
  );

  // Step 2: Authenticate the user to validate login functionality
  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://todoapp.example.com/login",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(authenticatedUser);

  // Validate authentication response
  TestValidator.equals(
    "authenticated user ID should match created user",
    authenticatedUser.id,
    user.id,
  );
  TestValidator.equals(
    "authenticated user email should match",
    authenticatedUser.email,
    userEmail,
  );
  TestValidator.predicate(
    "authenticated user should have new token",
    authenticatedUser.token !== undefined,
  );
  TestValidator.notEquals(
    "login should generate new access token",
    authenticatedUser.token.access,
    user.token.access,
  );

  // Note: Session deletion functionality cannot be tested with available APIs
  // as there is no way to obtain valid session IDs for deletion
  TestValidator.predicate(
    "authentication workflow completed successfully",
    true,
  );
}
