import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test soft deletion of guest accounts by authenticated moderators.
 *
 * This test validates the complete workflow of guest account soft deletion:
 *
 * 1. Create a guest account for testing deletion functionality
 * 2. Authenticate as moderator to establish authorization context
 * 3. Perform soft deletion of the guest account
 * 4. Verify that the guest record is marked as deleted with proper timestamp
 * 5. Ensure record integrity is maintained for audit purposes
 */
export async function test_api_guest_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account for testing deletion
  const guest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest);

  // Step 2: Authenticate as moderator to perform deletion operation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.content({ paragraphs: 1 }),
        moderation_level: "basic",
        ip: typia.random<
          string & tags.Pattern<"^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$">
        >(),
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Perform soft deletion of the guest account
  const deletedGuest: IDiscussionBoardGuest =
    await api.functional.discussionBoard.moderator.guests.erase(connection, {
      guestToken: guest.guest_token,
    });
  typia.assert(deletedGuest);

  // Step 4: Validate that the guest record is properly marked as deleted
  TestValidator.predicate(
    "guest record should have deleted_at timestamp set",
    deletedGuest.deleted_at !== null && deletedGuest.deleted_at !== undefined,
  );

  // Validate the deleted_at timestamp format
  TestValidator.predicate(
    "deleted_at timestamp should be valid ISO 8601 format",
    deletedGuest.deleted_at !== undefined &&
      /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/.test(
        deletedGuest.deleted_at,
      ),
  );

  // Step 5: Verify record integrity - all other properties should remain unchanged
  TestValidator.equals(
    "guest ID should remain unchanged after soft deletion",
    deletedGuest.id,
    guest.id,
  );

  TestValidator.equals(
    "guest token should remain unchanged after soft deletion",
    deletedGuest.guest_token,
    guest.guest_token,
  );

  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    deletedGuest.created_at,
    guest.created_at,
  );

  // The updated_at timestamp may change due to the deletion operation
  TestValidator.predicate(
    "updated_at timestamp should be set",
    deletedGuest.updated_at !== null && deletedGuest.updated_at !== undefined,
  );

  // Additional validation: Ensure updated_at is after created_at (logical consistency)
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(deletedGuest.updated_at) >= new Date(deletedGuest.created_at),
  );
}
