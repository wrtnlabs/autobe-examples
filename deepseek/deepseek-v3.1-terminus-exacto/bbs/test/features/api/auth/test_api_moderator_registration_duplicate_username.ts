import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration failure when attempting to use a username that
 * already exists in the system. This scenario validates the unique constraint
 * enforcement for moderator usernames. The test first creates a moderator
 * account with a specific username, then attempts to create another moderator
 * account with the same username. Validates that the system properly rejects
 * duplicate username registrations and returns appropriate error response to
 * maintain moderator identity uniqueness.
 */
export async function test_api_moderator_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Generate unique test data for the first moderator
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const duplicateUsername = "test_moderator_" + RandomGenerator.alphaNumeric(8);

  // Generate valid URIs for href and referrer that meet the format constraint
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 1: Create initial moderator account to establish duplicate username constraint
  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: firstModeratorEmail,
      username: duplicateUsername,
      password: "SecurePassword123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "basic",
      ip: "192.168.1.100",
      href: href,
      referrer: referrer,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(firstModerator);

  // Step 2: Attempt to create another moderator with the same username (different email)
  const secondModeratorEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      return await api.functional.auth.moderator.join(connection, {
        body: {
          email: secondModeratorEmail,
          username: duplicateUsername, // Same username as first moderator
          password: "AnotherPassword456!",
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          moderation_level: "basic",
          ip: "192.168.1.101",
          href: href,
          referrer: referrer,
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  // Verify the first moderator was created successfully
  TestValidator.equals(
    "first moderator username matches",
    firstModerator.username,
    duplicateUsername,
  );
  TestValidator.equals(
    "first moderator email matches",
    firstModerator.email,
    firstModeratorEmail,
  );
  TestValidator.predicate(
    "first moderator has valid token",
    firstModerator.token.access.length > 0,
  );
}
