import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user self-profile retrieval endpoint.
 *
 * This test validates that an authenticated user can retrieve their own profile
 * information without knowing their user ID. The endpoint uses the JWT token
 * from the authenticated session to identify which user is making the request
 * and returns their complete profile including email, status, and account
 * timestamps.
 *
 * Workflow:
 *
 * 1. Create a new user account with registration
 * 2. Retrieve the authenticated user's profile using the /me endpoint
 * 3. Validate that the retrieved profile matches the registered user's data
 * 4. Verify all required profile fields are present and correctly typed
 */
export async function test_api_user_profile_self_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<256>
  >();

  const registeredUser: ITodoAppUser =
    await api.functional.todoApp.auth.register.create(connection, {
      body: {
        email: registrationEmail,
        password: registrationPassword,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Retrieve the authenticated user's own profile using the /me endpoint
  const userProfile: ITodoAppUser =
    await api.functional.todoApp.users.me.at(connection);
  typia.assert(userProfile);

  // Step 3: Validate that the retrieved profile matches the registered user
  TestValidator.equals(
    "retrieved user ID matches registered user ID",
    userProfile.id,
    registeredUser.id,
  );

  TestValidator.equals(
    "retrieved user email matches registration email",
    userProfile.email,
    registrationEmail,
  );

  TestValidator.equals(
    "retrieved user status is active",
    userProfile.status,
    "active",
  );

  // Step 4: Verify profile has correct timestamps
  TestValidator.predicate(
    "user created_at timestamp is present and valid ISO 8601 format",
    () => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(userProfile.created_at),
  );

  TestValidator.predicate(
    "user updated_at timestamp is present and valid ISO 8601 format",
    () => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(userProfile.updated_at),
  );

  // Step 5: Verify soft delete status is not set for new user
  TestValidator.equals(
    "newly registered user has no deletion timestamp",
    userProfile.deleted_at,
    null,
  );
}
