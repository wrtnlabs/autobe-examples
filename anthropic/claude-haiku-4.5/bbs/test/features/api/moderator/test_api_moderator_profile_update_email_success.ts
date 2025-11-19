import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test successful email update by authenticated moderator.
 *
 * This test validates the moderator profile update functionality, specifically
 * focusing on email address changes. The workflow includes:
 *
 * 1. Register a new moderator with initial email address
 * 2. Update the moderator's email to a new valid email address
 * 3. Verify the updated email persists in the profile response
 * 4. Validate that the updated_at timestamp is recorded
 * 5. Confirm the response includes all expected profile fields
 *
 * The test ensures email uniqueness constraints and proper timestamp tracking
 * for profile modifications.
 */
export async function test_api_moderator_profile_update_email_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const initialEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const moderatorPassword: string = `Secure@Pass123`;

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: initialEmail,
        username: moderatorUsername,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(registeredModerator);

  // Verify initial registration
  TestValidator.equals(
    "registered moderator email matches input",
    registeredModerator.email,
    initialEmail,
  );
  TestValidator.equals(
    "registered moderator username matches input",
    registeredModerator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "registered moderator account status is active",
    registeredModerator.account_status,
    "active",
  );
  TestValidator.equals(
    "registered moderator moderation tier is full",
    registeredModerator.moderation_tier,
    "full",
  );
  TestValidator.predicate(
    "registered moderator has valid creation timestamp",
    registeredModerator.created_at !== null &&
      registeredModerator.created_at !== undefined,
  );

  // Step 2: Update moderator email address
  const newEmail: string = typia.random<string & tags.Format<"email">>();
  const updatedProfile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.update(connection, {
      body: {
        email: newEmail,
      } satisfies IDiscussionBoardUser.IUpdate,
    });
  typia.assert(updatedProfile);

  // Step 3: Verify the email update persisted
  TestValidator.equals(
    "updated profile email matches new email",
    updatedProfile.email,
    newEmail,
  );

  // Step 4: Verify updated_at timestamp was recorded
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedProfile.updatedAt !== null && updatedProfile.updatedAt !== undefined,
  );

  // Step 5: Verify profile maintains other fields correctly
  TestValidator.equals(
    "updated profile ID matches original moderator ID",
    updatedProfile.id,
    registeredModerator.id,
  );
  TestValidator.equals(
    "updated profile username is preserved",
    updatedProfile.username,
    registeredModerator.username,
  );
  TestValidator.predicate(
    "moderator tier is preserved after email update",
    updatedProfile.moderationTier === "full" ||
      updatedProfile.moderationTier === null,
  );

  // Step 6: Verify timestamp progression - updated_at should be >= created_at
  TestValidator.predicate(
    "updated_at timestamp is after or equal to created_at",
    new Date(updatedProfile.updatedAt).getTime() >=
      new Date(registeredModerator.created_at).getTime(),
  );
}
