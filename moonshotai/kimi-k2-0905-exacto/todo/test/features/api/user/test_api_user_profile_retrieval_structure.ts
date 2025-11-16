import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";

/**
 * Test profile data structure integrity including proper UUID format for user
 * ID, RFC 5322 email format compliance, and correct datetime format for
 * creation and update timestamps. This ensures the profile response maintains
 * consistent data structure for client applications.
 *
 * This test validates the complete user profile retrieval workflow:
 *
 * 1. Creates a new user account with random valid credentials
 * 2. Establishes authenticated session through login
 * 3. Retrieves user profile using the authenticated user ID
 * 4. Validates profile data structure integrity through typia.assert()
 * 5. Verifies basic data consistency between authorized user and profile response
 *
 * The test ensures client applications receive consistently formatted profile
 * data with proper validation handled by the type system and typia runtime
 * validation.
 */
export async function test_api_user_profile_retrieval_structure(
  connection: api.IConnection,
) {
  // Generate random user credentials for account creation
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://example.com/join";
  const referrer = "https://example.com/home";

  // Step 1: Create new user account
  const userAuthorized = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAuthorized);

  // Verify basic data consistency in authorized response
  TestValidator.equals(
    "created user email matches input",
    userAuthorized.email,
    email,
  );

  // Step 2: Retrieve user profile using the authenticated user ID
  const profile = await api.functional.todoApp.user.auth.users.profile.at(
    connection,
    {
      userId: userAuthorized.id,
    },
  );
  typia.assert(profile);

  // Step 3: Validate complete type structure through typia.assert
  // typia.assert() already validates all format constraints including:
  // - UUID format for user ID via tags.Format<"uuid">
  // - RFC 5322 email format via tags.Format<"email">
  // - ISO 8601 datetime format via tags.Format<"date-time">

  // Step 4: Verify profile data consistency with authorized user data
  TestValidator.equals(
    "profile ID matches authorized user ID",
    profile.id,
    userAuthorized.id,
  );
  TestValidator.equals(
    "profile email matches authorized user email",
    profile.email,
    userAuthorized.email,
  );
  TestValidator.equals(
    "profile created_at matches authorized user created_at",
    profile.created_at,
    userAuthorized.created_at,
  );
  TestValidator.equals(
    "profile updated_at matches authorized user updated_at",
    profile.updated_at,
    userAuthorized.updated_at,
  );

  // Step 5: Validate business logic
  TestValidator.predicate(
    "profile timestamps are chronologically valid",
    new Date(profile.created_at).getTime() <=
      new Date(profile.updated_at).getTime(),
  );
}
