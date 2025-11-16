import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test moderator registration failure when attempting to create an account with
 * an existing username.
 *
 * This test validates the platform's ability to detect duplicate usernames
 * during moderator registration and provide appropriate error messaging. The
 * test ensures username uniqueness across the platform, which is critical for
 * preventing account confusion and maintaining proper administrative access
 * control.
 *
 * The test workflow:
 *
 * 1. Create a new moderator account with unique credentials
 * 2. Attempt to create another moderator account with the same username
 * 3. Verify that the duplicate registration is rejected with proper error handling
 *
 * This validation is essential for the Economic Discussion platform to maintain
 * secure moderator account management and prevent unauthorized administrative
 * access.
 */
export async function test_api_moderator_join_duplicate_username(
  connection: api.IConnection,
) {
  // Generate unique base credentials for the first moderator
  const baseUsername = RandomGenerator.alphabets(10);
  const email1 = typia.random<string & tags.Format<"email">>();
  const passwordHash1 = RandomGenerator.alphaNumeric(16);
  const moderationLevel = RandomGenerator.pick([
    "admin",
    "moderator",
    "senior-moderator",
  ] as const);

  // Create the first moderator account successfully
  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: baseUsername,
      email: email1,
      password_hash: passwordHash1,
      moderation_level: moderationLevel,
      email_verified: false,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(firstModerator);

  // Attempt to create a second moderator with the same username but different email
  const email2 = typia.random<string & tags.Format<"email">>();
  const passwordHash2 = RandomGenerator.alphaNumeric(16);

  await TestValidator.error("duplicate username should fail", async () => {
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: baseUsername, // Same username as first moderator
        email: email2,
        password_hash: passwordHash2,
        moderation_level: moderationLevel,
        email_verified: false,
        two_factor_enabled: false,
      } satisfies IEconomicDiscussionModerator.ICreate,
    });
  });

  // Verify that attempting with same username but different case also fails
  const baseUsernameAlternatingCase = baseUsername
    .split("")
    .map((char, index) =>
      index % 2 === 0 ? char.toUpperCase() : char.toLowerCase(),
    )
    .join("");

  await TestValidator.error("case-variant username should fail", async () => {
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: baseUsernameAlternatingCase, // Case-variant of existing username
        email: email2,
        password_hash: passwordHash2,
        moderation_level: moderationLevel,
        email_verified: false,
        two_factor_enabled: false,
      } satisfies IEconomicDiscussionModerator.ICreate,
    });
  });

  // Verify that successful registration still works with different username
  const differentUsername = RandomGenerator.alphabets(10);
  const secondModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: differentUsername,
      email: email2,
      password_hash: passwordHash2,
      moderation_level: moderationLevel,
      email_verified: false,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(secondModerator);

  // Verify both moderators have different IDs and usernames
  TestValidator.notEquals(
    "moderator IDs should differ",
    firstModerator.id,
    secondModerator.id,
  );
  TestValidator.notEquals(
    "moderator usernames should differ",
    firstModerator.username,
    secondModerator.username,
  );
}
