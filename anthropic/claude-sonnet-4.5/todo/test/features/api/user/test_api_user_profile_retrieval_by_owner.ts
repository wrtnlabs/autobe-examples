import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that a user can successfully retrieve their own account information
 * after registration.
 *
 * This test validates the complete workflow of user registration followed by
 * profile retrieval, ensuring that newly created users can immediately access
 * their profile data including email, verification status, and account
 * metadata.
 *
 * Workflow:
 *
 * 1. Generate random test user credentials (email and password)
 * 2. Register a new user account via the join endpoint
 * 3. Validate the registration response contains complete user data and
 *    authentication tokens
 * 4. Retrieve the user's profile using their user ID
 * 5. Validate the retrieved profile matches the registration data
 * 6. Verify all user fields including UUID identifier, email, email_verified
 *    status, and timestamps
 */
export async function test_api_user_profile_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Generate test user data
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "SecurePassword123!";
  const testHref = "https://example.com/register";
  const testReferrer = "https://example.com/home";

  // Step 2: Register a new user account
  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: testHref,
      referrer: testReferrer,
    } satisfies ITodoListUser.ICreate,
  });

  // Step 3: Validate registration response
  typia.assert(registeredUser);

  // Validate email matches input
  TestValidator.equals(
    "registered email matches input",
    registeredUser.email,
    testEmail,
  );

  // Validate email_verified is false for new accounts
  TestValidator.equals(
    "new account email_verified is false",
    registeredUser.email_verified,
    false,
  );

  // Validate timestamps are present
  TestValidator.predicate(
    "created_at timestamp is present",
    registeredUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    registeredUser.updated_at.length > 0,
  );

  // Validate authentication token is issued
  TestValidator.predicate(
    "access token is issued",
    registeredUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is issued",
    registeredUser.token.refresh.length > 0,
  );

  // Step 4: Retrieve user profile using user ID
  const retrievedProfile = await api.functional.todoList.user.users.at(
    connection,
    {
      userId: registeredUser.id,
    },
  );

  // Step 5: Validate retrieved profile
  typia.assert(retrievedProfile);

  // Step 6: Compare retrieved profile with registration data
  TestValidator.equals(
    "retrieved user ID matches registered user ID",
    retrievedProfile.id,
    registeredUser.id,
  );

  TestValidator.equals(
    "retrieved email matches registered email",
    retrievedProfile.email,
    registeredUser.email,
  );

  TestValidator.equals(
    "retrieved email_verified matches registered value",
    retrievedProfile.email_verified,
    registeredUser.email_verified,
  );

  TestValidator.equals(
    "retrieved created_at matches registered created_at",
    retrievedProfile.created_at,
    registeredUser.created_at,
  );

  TestValidator.equals(
    "retrieved updated_at matches registered updated_at",
    retrievedProfile.updated_at,
    registeredUser.updated_at,
  );

  TestValidator.equals(
    "retrieved deleted_at matches registered deleted_at",
    retrievedProfile.deleted_at,
    registeredUser.deleted_at,
  );
}
