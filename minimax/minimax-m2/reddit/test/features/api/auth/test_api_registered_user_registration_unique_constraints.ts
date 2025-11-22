import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test user registration validation for unique constraints including duplicate
 * username detection and duplicate email prevention. Validates that the system
 * properly enforces data integrity and provides appropriate error responses for
 * conflicting credentials.
 */
export async function test_api_registered_user_registration_unique_constraints(
  connection: api.IConnection,
) {
  // Generate unique test data for initial registration
  const baseUsername = RandomGenerator.alphaNumeric(12);
  const baseEmail = typia.random<string & tags.Format<"email">>();
  const basePassword = "SecurePass123!";

  // Session tracking data
  const baseHref = "https://example.com/register";
  const baseReferrer = "https://example.com/landing";

  // Step 1: Create first valid user registration (baseline)
  const firstUser = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: baseUsername,
      email: baseEmail,
      password: basePassword,
      href: baseHref,
      referrer: baseReferrer,
      display_name: "First Test User",
      bio: "Testing unique constraints",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(firstUser);

  // Validate first registration was successful
  TestValidator.equals(
    "first user registration successful",
    firstUser.username,
    baseUsername,
  );
  TestValidator.equals("first user email matches", firstUser.email, baseEmail);
  TestValidator.equals(
    "first user account status active",
    firstUser.accountStatus,
    "active",
  );
  TestValidator.equals(
    "first user business status pending verification",
    firstUser.businessStatus,
    "pending_verification",
  );

  // Step 2: Test duplicate username with different email (should fail)
  const duplicateUsernameEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "duplicate username should fail registration",
    async () => {
      await api.functional.auth.registeredUser.join(connection, {
        body: {
          username: baseUsername, // Same username as first user
          email: duplicateUsernameEmail, // Different email
          password: basePassword,
          href: baseHref,
          referrer: baseReferrer,
          display_name: "Duplicate Username User",
        } satisfies IRedditPlatformRegisteredUser.ICreate,
      });
    },
  );

  // Step 3: Test duplicate email with different username (should fail)
  const duplicateEmailUsername = RandomGenerator.alphaNumeric(12);

  await TestValidator.error(
    "duplicate email should fail registration",
    async () => {
      await api.functional.auth.registeredUser.join(connection, {
        body: {
          username: duplicateEmailUsername, // Different username
          email: baseEmail, // Same email as first user
          password: basePassword,
          href: baseHref,
          referrer: baseReferrer,
          display_name: "Duplicate Email User",
        } satisfies IRedditPlatformRegisteredUser.ICreate,
      });
    },
  );

  // Step 4: Verify system integrity - create user with completely new credentials
  const newUsername = RandomGenerator.alphaNumeric(12);
  const newEmail = typia.random<string & tags.Format<"email">>();

  const secondUser = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: newUsername,
      email: newEmail,
      password: basePassword,
      href: baseHref,
      referrer: baseReferrer,
      display_name: "Second Test User",
      bio: "System integrity test",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(secondUser);

  // Validate second registration was successful
  TestValidator.equals(
    "second user registration successful",
    secondUser.username,
    newUsername,
  );
  TestValidator.equals("second user email matches", secondUser.email, newEmail);
  TestValidator.notEquals(
    "second user ID different from first",
    secondUser.id,
    firstUser.id,
  );
  TestValidator.equals(
    "second user account status active",
    secondUser.accountStatus,
    "active",
  );

  // Step 5: Test edge case - attempt to register with both username and email from different existing users
  await TestValidator.error(
    "registration should fail when both username and email already exist",
    async () => {
      await api.functional.auth.registeredUser.join(connection, {
        body: {
          username: firstUser.username, // From first user
          email: secondUser.email, // From second user
          password: basePassword,
          href: baseHref,
          referrer: baseReferrer,
          display_name: "Invalid User",
        } satisfies IRedditPlatformRegisteredUser.ICreate,
      });
    },
  );

  // Step 6: Validate final system state
  TestValidator.predicate(
    "first user still exists with original data",
    firstUser.username === baseUsername && firstUser.email === baseEmail,
  );
  TestValidator.predicate(
    "second user still exists with original data",
    secondUser.username === newUsername && secondUser.email === newEmail,
  );
}
