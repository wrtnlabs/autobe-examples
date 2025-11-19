import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that moderation_tier field is ignored in profile updates.
 *
 * This test validates that a moderator cannot modify their moderation_tier
 * through the profile update endpoint. The moderation_tier is an administrative
 * field that should be immutable via user-initiated profile updates.
 *
 * Steps:
 *
 * 1. Register a new moderator account (which initializes with moderation_tier:
 *    'full')
 * 2. Attempt to update the moderator's profile with a modified moderation_tier
 *    value
 * 3. Verify that the update succeeds for valid fields (email, username)
 * 4. Verify that moderation_tier remains unchanged as 'full'
 * 5. Confirm the profile was updated with new email/username but tier stayed
 *    'full'
 */
export async function test_api_moderator_profile_update_moderation_tier_field_ignored(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const registered: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(registered);

  // Verify initial moderation_tier is 'full'
  TestValidator.equals(
    "initial moderation_tier should be full",
    registered.moderation_tier,
    "full",
  );

  // Step 2: Attempt to update profile with a new email and username
  // The moderation_tier should be ignored even if included in the request
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const updated: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: newEmail,
        username: newUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updated);

  // Step 3: Verify the profile was updated with new email and username
  TestValidator.equals(
    "updated email should match request",
    updated.email,
    newEmail,
  );

  TestValidator.equals(
    "updated username should match request",
    updated.username,
    newUsername,
  );

  // Step 4: Verify that moderation_tier remained 'full' and was not modified
  TestValidator.equals(
    "moderation_tier should remain full after profile update",
    updated.moderationTier,
    "full",
  );

  // Step 5: Confirm the moderator's status and other fields are intact
  TestValidator.equals(
    "moderator id should be preserved",
    updated.id,
    registered.id,
  );

  TestValidator.predicate(
    "account should still be active",
    updated.accountStatus === "active",
  );
}
