import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test username immutability for moderators during profile updates.
 *
 * Verifies that moderator usernames are immutable after account creation.
 * Moderator registers with a valid username matching pattern
 * ^[a-zA-Z0-9_]{3,50}$, then attempts to update profile including username
 * changes. Expects the API to reject or ignore username modifications and
 * preserve the original username.
 *
 * Steps:
 *
 * 1. Create moderator with valid username matching required pattern
 * 2. Attempt to update profile with different username
 * 3. Verify original username persists after update attempt
 * 4. Update profile with valid email to confirm profile updates work
 * 5. Verify username still unchanged after successful email update
 */
export async function test_api_moderator_profile_update_invalid_username_format(
  connection: api.IConnection,
) {
  // Step 1: Create moderator with valid username matching pattern
  const validUsername =
    RandomGenerator.alphabets(3) + RandomGenerator.alphaNumeric(4);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace(/^[^@]+/, (match) => match.substring(0, 10)),
        password: "ValidPass123!",
        username: validUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator created with valid username",
    moderator.username,
    validUsername,
  );

  // Step 2: Attempt to update profile with different username
  // Note: Username field is accepted for API consistency but is immutable per business rules
  const attemptedNewUsername = RandomGenerator.alphabets(5);
  const updateResult: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        username: attemptedNewUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updateResult);

  // Step 3: Verify original username persists (immutability check)
  TestValidator.equals(
    "username remains immutable after update attempt",
    updateResult.username,
    validUsername,
  );
  TestValidator.notEquals(
    "attempted new username was not applied",
    updateResult.username,
    attemptedNewUsername,
  );

  // Step 4: Update profile with valid email to confirm updates work for other fields
  const newEmail = typia
    .random<string & tags.Format<"email">>()
    .replace(/^[^@]+/, (match) => match.substring(0, 10));
  const emailUpdateResult: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: newEmail,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(emailUpdateResult);
  TestValidator.equals(
    "email was updated successfully",
    emailUpdateResult.email,
    newEmail,
  );

  // Step 5: Verify username still unchanged after successful email update
  TestValidator.equals(
    "username remains immutable even after successful profile update",
    emailUpdateResult.username,
    validUsername,
  );
}
