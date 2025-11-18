import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test authenticated user profile retrieval.
 *
 * This test validates that an authenticated user can successfully retrieve
 * their own account information through the GET /todoList/user/users/me
 * endpoint.
 *
 * The test follows a complete user workflow:
 *
 * 1. Register a new user account using the join endpoint with valid credentials
 * 2. Verify successful registration and authentication token receipt
 * 3. Call the profile retrieval endpoint to fetch the authenticated user's data
 * 4. Validate that all expected user fields are present and correct
 * 5. Ensure the data returned matches the registration data
 */
export async function test_api_user_profile_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registrationData = {
    email: userEmail,
    password: userPassword,
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoListUser.ICreate;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredUser);

  // Step 2: Validate registration response structure
  TestValidator.equals(
    "registered email matches input in lowercase",
    registeredUser.email,
    userEmail.toLowerCase(),
  );

  // Verify authentication token is present
  typia.assert<IAuthorizationToken>(registeredUser.token);

  // Step 3: Retrieve the authenticated user's profile
  const userProfile: ITodoListUser =
    await api.functional.todoList.user.users.me.at(connection);
  typia.assert(userProfile);

  // Step 4: Validate profile data matches registration
  TestValidator.equals(
    "profile id matches registered user id",
    userProfile.id,
    registeredUser.id,
  );

  TestValidator.equals(
    "profile email matches registered email",
    userProfile.email,
    registeredUser.email,
  );

  TestValidator.equals(
    "profile created_at matches registered user",
    userProfile.created_at,
    registeredUser.created_at,
  );

  TestValidator.equals(
    "profile updated_at matches registered user",
    userProfile.updated_at,
    registeredUser.updated_at,
  );
}
