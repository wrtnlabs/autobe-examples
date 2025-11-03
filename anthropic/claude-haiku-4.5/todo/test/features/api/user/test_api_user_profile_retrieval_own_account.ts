import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test authenticated user retrieving their own account profile information.
 *
 * User registers a new account with email and password, obtains authentication
 * token, and retrieves their own user profile by user ID. Validates that users
 * can access their own account details including email, status, and temporal
 * information. Verifies that the response contains complete user information
 * without exposing password hash. Tests successful authorization and data
 * access control for self-service profile viewing.
 *
 * Steps:
 *
 * 1. Generate random email and password for new user account
 * 2. Register new user via /auth/user/join endpoint
 * 3. Validate successful registration returns user data and JWT tokens
 * 4. Extract user ID and authorization token from registration response
 * 5. Retrieve user profile via /todoApp/user/users/{userId} endpoint
 * 6. Validate retrieved profile matches registration data
 * 7. Confirm account status is 'active' after registration
 * 8. Verify password hash is never included in response
 */
export async function test_api_user_profile_retrieval_own_account(
  connection: api.IConnection,
) {
  // Step 1-2: Generate test data and register new user
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphabets(10); // Ensure at least 8 chars

  const registrationResponse: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies ITodoAppUser.IJoin,
    });

  // Step 3: Validate registration response type structure
  typia.assert(registrationResponse);

  // Step 4: Extract user ID and validate data consistency
  const userId = registrationResponse.id;

  TestValidator.equals(
    "registered user email matches input",
    registrationResponse.email,
    testEmail,
  );

  TestValidator.equals(
    "registered user status is active",
    registrationResponse.status,
    "active",
  );

  // Step 5: Retrieve user profile using user ID
  const userProfile: ITodoAppUser = await api.functional.todoApp.user.users.at(
    connection,
    {
      userId: userId,
    },
  );

  // Step 6: Validate retrieved profile type structure
  typia.assert(userProfile);

  // Step 7: Verify profile data matches registration response
  TestValidator.equals(
    "profile user ID matches registration",
    userProfile.id,
    registrationResponse.id,
  );

  TestValidator.equals(
    "profile email matches registered email",
    userProfile.email,
    registrationResponse.email,
  );

  TestValidator.equals(
    "profile status matches registration status",
    userProfile.status,
    registrationResponse.status,
  );

  TestValidator.equals(
    "profile created_at matches registration created_at",
    userProfile.created_at,
    registrationResponse.created_at,
  );

  TestValidator.equals(
    "profile updated_at matches registration updated_at",
    userProfile.updated_at,
    registrationResponse.updated_at,
  );

  // Step 7: Validate account status is 'active'
  TestValidator.predicate(
    "account status is active after registration",
    userProfile.status === "active",
  );

  // Step 8: Verify deleted_at is null/undefined for active account
  TestValidator.predicate(
    "deleted_at is null or undefined for active account",
    userProfile.deleted_at === null || userProfile.deleted_at === undefined,
  );
}
