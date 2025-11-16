import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test registration rejection when the provided username already exists in the
 * system.
 *
 * The endpoint must enforce username uniqueness across all moderator accounts.
 * If the registration attempt uses a username already associated with another
 * moderator, the endpoint should return an appropriate error indicating the
 * username is already taken. The test verifies that the unique constraint on
 * the username field prevents duplicate registration and guides users to choose
 * distinct usernames.
 *
 * Test flow:
 *
 * 1. Register the first moderator with a unique username
 * 2. Attempt to register a second moderator with the same username
 * 3. Verify the second registration fails with an appropriate error
 * 4. Confirm the system enforces username uniqueness
 */
export async function test_api_moderator_registration_with_duplicate_username(
  connection: api.IConnection,
) {
  // Step 1: Register the first moderator with a unique username
  const uniqueUsername =
    RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4);
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: firstEmail,
      username: uniqueUsername,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(firstModerator);

  TestValidator.equals(
    "first moderator username matches input",
    firstModerator.username,
    uniqueUsername,
  );

  // Step 2: Attempt to register a second moderator with the same username
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondPassword = RandomGenerator.alphaNumeric(12);

  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: secondEmail,
          username: uniqueUsername, // Same username as first moderator
          password: secondPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformModerator.ICreate,
      });
    },
  );

  // Step 3: Verify that first moderator still exists with correct data
  TestValidator.predicate(
    "first moderator registration was successful",
    firstModerator.id !== null && firstModerator.id !== undefined,
  );

  TestValidator.equals(
    "first moderator email matches registration",
    firstModerator.email,
    firstEmail,
  );
}
