import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";

/**
 * Test retrieval of the authenticated user's own profile information.
 *
 * This test validates the secure profile retrieval mechanism that maintains
 * user privacy while providing necessary account information. The test follows
 * a complete user journey:
 *
 * 1. Create a new user account with valid credentials
 * 2. Establish authenticated session through login
 * 3. Retrieve the user's own profile data
 * 4. Verify all profile information matches the created account
 *
 * The profile retrieval operation should return essential account details
 * including email address, account creation timestamp, and last modification
 * timestamp while excluding sensitive authentication information like password
 * hashes.
 */
export async function test_api_user_profile_retrieval_self(
  connection: api.IConnection,
) {
  // Generate test user credentials with realistic data
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(12);

  // Step 1: Create new user account
  const joinData = {
    email: testEmail,
    password: testPassword,
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.IJoin;

  const createdUser = await api.functional.auth.user.join(connection, {
    body: joinData,
  });
  typia.assert(createdUser);

  // Step 2: Login to establish authenticated session
  const loginData = {
    email: testEmail,
    password: testPassword,
    href: "https://example.com/login",
    referrer: "https://example.com/join",
  } satisfies ITodoAppUser.ILogin;

  const loggedInUser = await api.functional.auth.user.login(connection, {
    body: loginData,
  });
  typia.assert(loggedInUser);

  // Verify login was successful and user data matches
  TestValidator.equals("user ID consistency", loggedInUser.id, createdUser.id);
  TestValidator.equals(
    "email consistency",
    loggedInUser.email,
    createdUser.email,
  );

  // Step 3: Retrieve user profile data
  const userProfile = await api.functional.todoApp.user.auth.users.profile.at(
    connection,
    {
      userId: loggedInUser.id,
    },
  );
  typia.assert(userProfile);

  // Step 4: Verify profile data integrity and structure
  TestValidator.equals(
    "profile ID matches user",
    userProfile.id,
    loggedInUser.id,
  );
  TestValidator.equals(
    "profile email matches user",
    userProfile.email,
    loggedInUser.email,
  );
  TestValidator.equals(
    "profile email matches original",
    userProfile.email,
    testEmail,
  );

  // Verify timestamps are present and valid ISO 8601 format
  TestValidator.predicate(
    "creation timestamp exists",
    userProfile.created_at !== null,
  );
  TestValidator.predicate(
    "update timestamp exists",
    userProfile.updated_at !== null,
  );

  // Use typia for comprehensive type validation of the profile structure
  typia.assert<ITodoAppUserProfile>(userProfile);

  // Verify the profile contains exactly the expected properties (no extras)
  const expectedKeys = ["id", "email", "created_at", "updated_at"];
  const actualKeys = Object.keys(userProfile).sort();
  TestValidator.equals(
    "profile has correct structure",
    actualKeys,
    expectedKeys,
  );

  // Verify profile timestamps are logical (updated_at >= created_at)
  const createdTime = new Date(userProfile.created_at).getTime();
  const updatedTime = new Date(userProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is not before created_at",
    updatedTime >= createdTime,
  );
}
