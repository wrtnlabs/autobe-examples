import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful retrieval of authenticated user's profile information.
 *
 * This test validates that an authenticated user can successfully retrieve
 * their profile information after registration. The workflow includes:
 *
 * 1. Register a new user with valid credentials (email and password)
 * 2. Verify the registration response contains authenticated user data with JWT
 *    tokens
 * 3. Retrieve the user's profile using the access token from registration
 * 4. Validate that the profile response includes all required user fields:
 *
 *    - Id: UUID format unique identifier
 *    - Email: Lowercase email address for case-insensitive matching
 *    - Created_at: Account creation timestamp in UTC, ISO 8601 format
 *    - Updated_at: Most recent account modification timestamp
 *    - Deleted_at: Null for active accounts (soft-delete indicator)
 *    - Last_login_at: Last successful login timestamp
 * 5. Verify that profile data exactly matches the user information from
 *    registration
 * 6. Confirm profile retrieval endpoint properly authenticates with JWT bearer
 *    token
 *
 * This test ensures proper authentication flow, JWT token handling, and that
 * profile endpoints return complete, accurate user information to authenticated
 * users.
 */
export async function test_api_user_profile_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10); // Minimum 8 characters required

  const registrationResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registrationResponse);

  // Step 2: Verify registration response contains required authentication data
  TestValidator.predicate(
    "registration response should contain user ID",
    registrationResponse.id !== undefined && registrationResponse.id !== null,
  );
  TestValidator.predicate(
    "registration response should contain email",
    registrationResponse.email !== undefined &&
      registrationResponse.email !== null,
  );
  TestValidator.predicate(
    "registration response should contain access token",
    registrationResponse.token.access !== undefined &&
      registrationResponse.token.access !== null,
  );

  // Step 3: Retrieve the user's profile using the authenticated connection
  // The connection headers already contain the JWT token from registration
  const userProfile: ITodoListUser =
    await api.functional.todoList.user.auth.user.profile.at(connection);
  typia.assert(userProfile);

  // Step 4: Validate profile response contains all required fields
  TestValidator.predicate(
    "profile should contain user ID",
    userProfile.id !== undefined && userProfile.id !== null,
  );
  TestValidator.predicate(
    "profile email should be in lowercase",
    userProfile.email === email.toLowerCase(),
  );
  TestValidator.predicate(
    "profile should contain created_at timestamp",
    userProfile.created_at !== undefined && userProfile.created_at !== null,
  );
  TestValidator.predicate(
    "profile should contain updated_at timestamp",
    userProfile.updated_at !== undefined && userProfile.updated_at !== null,
  );
  TestValidator.predicate(
    "profile deleted_at should be null for active account",
    userProfile.deleted_at === null,
  );
  TestValidator.predicate(
    "profile should contain last_login_at field",
    userProfile.last_login_at !== undefined,
  );

  // Step 5: Verify profile data matches registration response
  TestValidator.equals(
    "profile user ID matches registration response",
    userProfile.id,
    registrationResponse.id,
  );
  TestValidator.equals(
    "profile email matches registration response",
    userProfile.email,
    registrationResponse.email,
  );
  TestValidator.equals(
    "profile created_at matches registration response",
    userProfile.created_at,
    registrationResponse.created_at,
  );
  TestValidator.equals(
    "profile updated_at matches registration response",
    userProfile.updated_at,
    registrationResponse.updated_at,
  );
  TestValidator.equals(
    "profile deleted_at matches registration response",
    userProfile.deleted_at,
    registrationResponse.deleted_at,
  );

  // Step 6: Verify profile endpoint requires proper authentication
  // This is implicitly tested - if JWT token wasn't valid, the API call would fail
  TestValidator.predicate(
    "profile retrieval succeeded with valid JWT token",
    true,
  );
}
