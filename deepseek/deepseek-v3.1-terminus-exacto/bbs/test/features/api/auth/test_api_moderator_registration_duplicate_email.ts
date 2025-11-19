import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration failure when attempting to use an email address
 * that already exists in the system. This scenario validates the unique
 * constraint enforcement for moderator email addresses. The test first creates
 * a moderator account with a specific email, then attempts to create another
 * moderator account with the same email address. Validates that the system
 * properly rejects duplicate email registrations and returns appropriate error
 * response to maintain data integrity.
 */
export async function test_api_moderator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Generate unique test data for initial moderator registration
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });
  const moderationLevel = RandomGenerator.pick([
    "basic",
    "senior",
    "admin",
  ] as const);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create initial moderator account to establish duplicate email constraint
  const initialModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email,
        username,
        password,
        display_name: displayName,
        bio,
        moderation_level: moderationLevel,
        href,
        referrer,
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(initialModerator);

  // Step 3: Attempt to create another moderator with the same email (should fail)
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      return await api.functional.auth.moderator.join(connection, {
        body: {
          email,
          username: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          password: RandomGenerator.alphaNumeric(12),
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          moderation_level: RandomGenerator.pick([
            "basic",
            "senior",
            "admin",
          ] as const),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  // Step 4: Validate that initial moderator account remains intact
  TestValidator.equals(
    "initial moderator email should match",
    initialModerator.email,
    email,
  );
  TestValidator.equals(
    "initial moderator username should match",
    initialModerator.username,
    username,
  );
  TestValidator.predicate(
    "initial moderator should have valid token",
    initialModerator.token.access.length > 0,
  );
}
