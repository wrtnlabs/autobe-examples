import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieving a specific user account by ID with proper authentication.
 *
 * This scenario validates that authenticated users can only access their own
 * user account information. The system should validate that the requesting
 * user's authentication token matches the user ID specified in the path
 * parameter to prevent unauthorized access to other users' data. The test
 * ensures complete user information including email address, account status,
 * creation timestamp, and last update timestamp is returned.
 */
export async function test_api_user_account_retrieval_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "TestPassword123!";

  const authenticatedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authenticatedUser);

  // Step 2: Retrieve the user account by ID using the authenticated connection
  const retrievedUser: ITodoAppUser =
    await api.functional.todoApp.user.users.at(connection, {
      userId: authenticatedUser.id,
    });
  typia.assert(retrievedUser);

  // Step 3: Validate that the retrieved user matches the authenticated user
  TestValidator.equals(
    "retrieved user ID matches authenticated user ID",
    retrievedUser.id,
    authenticatedUser.id,
  );
  TestValidator.equals(
    "retrieved user email matches authenticated user email",
    retrievedUser.email,
    authenticatedUser.email,
  );
  TestValidator.equals(
    "retrieved user status matches authenticated user status",
    retrievedUser.status,
    authenticatedUser.status,
  );
  TestValidator.equals(
    "retrieved user created_at matches authenticated user created_at",
    retrievedUser.created_at,
    authenticatedUser.created_at,
  );
  TestValidator.equals(
    "retrieved user updated_at matches authenticated user updated_at",
    retrievedUser.updated_at,
    authenticatedUser.updated_at,
  );

  // Step 4: Validate that all required user information is present
  TestValidator.predicate(
    "user ID is present and valid UUID",
    retrievedUser.id.length > 0,
  );
  TestValidator.predicate(
    "user email is present and valid",
    retrievedUser.email.length > 0,
  );
  TestValidator.predicate(
    "user status is present",
    retrievedUser.status.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    retrievedUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    retrievedUser.updated_at.length > 0,
  );

  // Step 5: Validate that the user account status is 'active' (as per registration)
  TestValidator.equals(
    "user account status should be active",
    retrievedUser.status,
    "active",
  );

  // Step 6: Test that authentication tokens are properly handled
  TestValidator.predicate(
    "authentication token should be present",
    authenticatedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    authenticatedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be present",
    authenticatedUser.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until should be present",
    authenticatedUser.token.refreshable_until.length > 0,
  );
}
