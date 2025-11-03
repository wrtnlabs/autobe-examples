import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test biography field length boundary conditions in moderator profile updates.
 *
 * This test validates that the biography field in moderator profiles correctly
 * handles valid length scenarios within the 500 character maximum constraint.
 * It tests two critical boundary scenarios:
 *
 * 1. Biography at exactly 500 characters - validates the upper boundary limit
 * 2. Biography under 500 characters - validates normal operation within limits
 *
 * The test ensures that moderators can successfully save biographies up to the
 * maximum allowed length, maintaining data integrity and consistent user
 * experience.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Update profile with bio at exactly 500 characters (boundary validation)
 * 3. Update profile with bio under 500 characters (normal case)
 * 4. Verify all responses match expected behavior and constraints
 */
export async function test_api_moderator_profile_update_bio_length_constraint(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorPassword = "SecurePass123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://test.example.com/moderator/join",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(moderator);

  // Step 2: Test with bio at exactly 500 characters (boundary validation)
  const exactBio = RandomGenerator.alphabets(500);

  const updatedWithExact: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: moderator.username,
        body: {
          bio: exactBio,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );

  typia.assert(updatedWithExact);
  TestValidator.equals(
    "bio at exactly 500 characters should be saved",
    updatedWithExact.bio,
    exactBio,
  );

  // Step 3: Test with bio under 500 characters (normal valid case)
  const shortBio = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 10,
  });

  const updatedWithShort: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: moderator.username,
        body: {
          bio: shortBio,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );

  typia.assert(updatedWithShort);
  TestValidator.equals(
    "bio under 500 characters should be saved",
    updatedWithShort.bio,
    shortBio,
  );
}
