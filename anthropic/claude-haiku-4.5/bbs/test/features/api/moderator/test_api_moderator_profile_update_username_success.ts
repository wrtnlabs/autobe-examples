import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test successful username update by authenticated moderator.
 *
 * This test validates the complete profile update workflow for moderators:
 *
 * 1. Register a new moderator account with email, password, and initial username
 * 2. Verify successful authentication and JWT token generation
 * 3. Update the moderator's username to a new valid name
 * 4. Validate the updated profile reflects the new username and updated_at
 *    timestamp
 * 5. Verify username change is persisted and unique
 *
 * The test ensures that moderators can successfully update their usernames, the
 * system properly validates username format (3-50 chars, alphanumeric +
 * underscore), and audit timestamps accurately record the modification time.
 */
export async function test_api_moderator_profile_update_username_success(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const initialUsername = RandomGenerator.alphaNumeric(5);
  const moderatorPassword = "TestPass123!";

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: initialUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(createdModerator);
  TestValidator.equals(
    "created moderator email matches",
    createdModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "created moderator username matches",
    createdModerator.username,
    initialUsername,
  );
  TestValidator.predicate(
    "created moderator has valid JWT token",
    !!createdModerator.token.access && !!createdModerator.token.refresh,
  );

  // Step 2: Generate new username for update
  const newUsername = RandomGenerator.alphaNumeric(7);

  // Step 3: Update moderator profile with new username
  const updatedProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        username: newUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });

  typia.assert(updatedProfile);

  // Step 4: Validate updated profile
  TestValidator.equals(
    "updated username matches request",
    updatedProfile.username,
    newUsername,
  );
  TestValidator.equals(
    "user ID persists",
    updatedProfile.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "email remains unchanged",
    updatedProfile.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "updated_at timestamp is newer",
    new Date(updatedProfile.updatedAt) >= new Date(createdModerator.updated_at),
  );
  TestValidator.predicate(
    "account status is active",
    updatedProfile.accountStatus === "active",
  );
  TestValidator.predicate(
    "email verified status is set",
    typeof updatedProfile.emailVerified === "boolean",
  );
}
