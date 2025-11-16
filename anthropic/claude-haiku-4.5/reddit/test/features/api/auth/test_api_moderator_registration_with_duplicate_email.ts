import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validates that moderator registration rejects duplicate email addresses.
 *
 * Tests that the moderator registration endpoint properly enforces email
 * uniqueness constraints. When attempting to register with an email that is
 * already associated with an existing moderator account, the API should return
 * an error response (409 Conflict or 400 Bad Request).
 *
 * This test ensures:
 *
 * 1. Initial moderator registration succeeds with a valid email
 * 2. Subsequent registration attempts with the same email are rejected
 * 3. The API enforces email uniqueness across the moderator accounts table
 * 4. Proper error response is returned for duplicate email violations
 */
export async function test_api_moderator_registration_with_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a unique email for the first moderator
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstUsername = RandomGenerator.name(1);
  const firstPassword = RandomGenerator.alphaNumeric(12);

  // Register the first moderator successfully
  const firstModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstEmail,
        username: firstUsername,
        password: firstPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Verify the first moderator was created successfully
  TestValidator.equals(
    "first moderator email matches",
    firstModerator.email,
    firstEmail,
  );
  TestValidator.equals(
    "first moderator username matches",
    firstModerator.username,
    firstUsername,
  );

  // Attempt to register another moderator with the same email
  // This should fail because the email is already in use
  const secondUsername = RandomGenerator.name(1);
  const secondPassword = RandomGenerator.alphaNumeric(12);

  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: firstEmail, // Using the same email as the first moderator
          username: secondUsername,
          password: secondPassword,
          href: "https://example.com/auth/register",
          referrer: "https://example.com/",
        } satisfies ICommunityPlatformModerator.ICreate,
      });
    },
  );
}
