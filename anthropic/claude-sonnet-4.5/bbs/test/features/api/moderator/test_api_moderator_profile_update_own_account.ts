import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator profile update workflow.
 *
 * This test validates that a moderator can successfully update their own
 * account profile information including email, username, display_name, and
 * password.
 *
 * Process:
 *
 * 1. Register a new moderator account
 * 2. Update the moderator's profile with new values
 * 3. Verify all updated fields are correctly persisted
 * 4. Confirm system-managed fields remain unchanged
 */
export async function test_api_moderator_profile_update_own_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalUsername = RandomGenerator.alphaNumeric(10);
  const originalDisplayName = RandomGenerator.name();
  const originalPassword = "Password123";

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: originalEmail,
        password: originalPassword,
        username: originalUsername,
        display_name: originalDisplayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(registeredModerator);

  // Store original values for comparison
  const originalId = registeredModerator.id;
  const originalCreatedAt = registeredModerator.created_at;
  const originalIsActive = registeredModerator.is_active;

  // Step 2: Update the moderator's profile
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedUsername = RandomGenerator.alphaNumeric(12);
  const updatedDisplayName = RandomGenerator.name(2);
  const updatedPassword = "NewPassword456";

  const updatedModerator: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: {
          email: updatedEmail,
          username: updatedUsername,
          display_name: updatedDisplayName,
          password: updatedPassword,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedModerator);

  // Step 3: Verify updated fields are correctly persisted
  TestValidator.equals(
    "updated email matches",
    updatedModerator.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated username matches",
    updatedModerator.username,
    updatedUsername,
  );
  TestValidator.equals(
    "updated display_name matches",
    updatedModerator.display_name,
    updatedDisplayName,
  );

  // Step 4: Verify email_verified is reset to false after email change
  TestValidator.equals(
    "email_verified reset to false",
    updatedModerator.email_verified,
    false,
  );

  // Step 5: Verify system-managed fields remain unchanged
  TestValidator.equals("id remains unchanged", updatedModerator.id, originalId);
  TestValidator.equals(
    "created_at remains unchanged",
    updatedModerator.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "is_active remains unchanged",
    updatedModerator.is_active,
    originalIsActive,
  );

  // Handle nullable deleted_at field properly
  if (
    updatedModerator.deleted_at !== null &&
    updatedModerator.deleted_at !== undefined
  ) {
    throw new Error("deleted_at should be null for active moderator");
  }

  // Step 6: Verify updated_at timestamp has been refreshed
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    new Date(updatedModerator.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
}
