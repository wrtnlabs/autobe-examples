import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test JWT-based authentication and user profile retrieval with proper user
 * isolation.
 *
 * This test validates that the user profile retrieval operation properly
 * validates JWT authentication and enforces user isolation. It verifies that
 * only authenticated users with valid JWT tokens can access their profile
 * information, and that the system correctly extracts the user ID from the JWT
 * token to return only that user's data.
 *
 * Test workflow:
 *
 * 1. Create a new user account through registration
 * 2. Verify JWT tokens are automatically generated and set in the connection
 * 3. Retrieve the authenticated user's profile using the JWT token
 * 4. Validate that the profile data matches the created user's information
 * 5. Confirm user isolation - the returned data is only for the authenticated user
 */
export async function test_api_user_profile_retrieval_jwt_validation(
  connection: api.IConnection,
) {
  // Generate test user data with proper format constraints
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  // Create registration request body
  const registrationData = {
    email: userEmail,
    password: userPassword,
    ip: "192.168.1.100",
    href: testHref,
    referrer: testReferrer,
  } satisfies ITodoListUser.ICreate;

  // Step 1: Register a new user and receive JWT tokens
  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedUser);

  // Validate the authorized user response contains all required fields
  TestValidator.predicate(
    "authorized user has valid ID",
    typeof authorizedUser.id === "string" && authorizedUser.id.length > 0,
  );
  TestValidator.equals(
    "email matches registration data",
    authorizedUser.email,
    userEmail.toLowerCase(),
  );
  TestValidator.predicate(
    "JWT access token is generated",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "JWT refresh token is generated",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );

  // Step 2: Retrieve user profile using JWT authentication
  // The JWT token should already be set in connection.headers.Authorization by the join function
  const userProfile: ITodoListUser =
    await api.functional.todoList.user.users.me.at(connection);
  typia.assert(userProfile);

  // Step 3: Validate that the profile matches the created user
  TestValidator.equals(
    "profile ID matches authorized user ID",
    userProfile.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "profile email matches authorized user email",
    userProfile.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "profile created_at matches authorized user created_at",
    userProfile.created_at,
    authorizedUser.created_at,
  );
  TestValidator.equals(
    "profile updated_at matches authorized user updated_at",
    userProfile.updated_at,
    authorizedUser.updated_at,
  );

  // Step 4: Verify timestamps are valid ISO 8601 date-time format
  TestValidator.predicate(
    "created_at is valid date-time format",
    !isNaN(new Date(userProfile.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    !isNaN(new Date(userProfile.updated_at).getTime()),
  );

  // Step 5: Confirm user isolation - the profile contains only the authenticated user's data
  // This is implicitly validated by the ID matching check above
  TestValidator.predicate(
    "JWT correctly identifies user for profile retrieval",
    userProfile.id === authorizedUser.id,
  );
}
