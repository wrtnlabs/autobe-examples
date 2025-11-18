import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that all timestamp fields in the profile response are accurate and in
 * proper ISO 8601 UTC format.
 *
 * Registers a new user account and immediately retrieves their profile to
 * verify timestamp accuracy. Validates that all timestamp fields (created_at,
 * updated_at, and last_login_at) are in ISO 8601 format with UTC timezone
 * indicator ('Z' suffix). Ensures that created_at and updated_at are very close
 * in time (within seconds) for a newly created account, and that last_login_at
 * reflects the recent login time. This test ensures timestamp data integrity
 * and proper timezone handling in the API.
 *
 * Test steps:
 *
 * 1. Generate random email and password for new user registration
 * 2. Register new user account via POST /auth/user/join endpoint
 * 3. Validate that authorization token is set in connection headers
 * 4. Retrieve user profile via GET /todoList/user/auth/user/profile endpoint
 * 5. Validate profile response type with typia.assert()
 * 6. Verify created_at timestamp is in ISO 8601 format with 'Z' suffix
 * 7. Verify updated_at timestamp is in ISO 8601 format with 'Z' suffix
 * 8. Verify last_login_at timestamp is in ISO 8601 format with 'Z' suffix
 *    (represents recent login)
 * 9. Validate that created_at and updated_at are within a few seconds of each
 *    other
 * 10. Validate that last_login_at is very recent (within the last minute)
 * 11. Ensure deleted_at is null for active account
 */
export async function test_api_user_profile_timestamp_accuracy(
  connection: api.IConnection,
) {
  // Generate random test data for user registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  // Register new user account
  const registrationResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000/auth/join",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registrationResponse);

  // Verify authorization token is set
  TestValidator.predicate(
    "authorization token should be set in headers",
    connection.headers?.Authorization !== undefined,
  );

  // Retrieve user profile
  const profile =
    await api.functional.todoList.user.auth.user.profile.at(connection);
  typia.assert(profile);

  // Validate created_at is in ISO 8601 format with 'Z' suffix
  TestValidator.predicate(
    "created_at should be in ISO 8601 format with Z suffix",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(profile.created_at),
  );

  // Validate updated_at is in ISO 8601 format with 'Z' suffix
  TestValidator.predicate(
    "updated_at should be in ISO 8601 format with Z suffix",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(profile.updated_at),
  );

  // Validate last_login_at is in ISO 8601 format with 'Z' suffix (if not null)
  TestValidator.predicate(
    "last_login_at should be in ISO 8601 format with Z suffix or null",
    profile.last_login_at === null ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
        profile.last_login_at,
      ),
  );

  // Validate that created_at and updated_at are close in time (within 5 seconds)
  const createdTime = new Date(profile.created_at).getTime();
  const updatedTime = new Date(profile.updated_at).getTime();
  const timeDifference = Math.abs(updatedTime - createdTime);

  TestValidator.predicate(
    "created_at and updated_at should be within 5 seconds of each other",
    timeDifference <= 5000,
  );

  // Validate that last_login_at is recent if present (within last 60 seconds)
  if (profile.last_login_at !== null) {
    const lastLoginTime = new Date(profile.last_login_at).getTime();
    const currentTime = new Date().getTime();
    const loginAgeMilliseconds = currentTime - lastLoginTime;

    TestValidator.predicate(
      "last_login_at should reflect recent login (within 60 seconds)",
      loginAgeMilliseconds <= 60000,
    );
  }

  // Validate that deleted_at is null for active account
  TestValidator.equals(
    "deleted_at should be null for active account",
    profile.deleted_at,
    null,
  );
}
