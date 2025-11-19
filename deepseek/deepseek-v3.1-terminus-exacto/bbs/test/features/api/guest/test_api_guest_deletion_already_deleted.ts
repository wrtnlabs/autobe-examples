import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test deletion of a guest account that has already been soft deleted.
 *
 * This test validates the system's handling of duplicate deletion attempts on
 * guest accounts. It creates a guest account, authenticates as a moderator,
 * performs an initial soft deletion, then attempts to delete the same guest
 * again. The test ensures the operation handles already-deleted guests
 * appropriately according to business rules.
 */
export async function test_api_guest_deletion_already_deleted(
  connection: api.IConnection,
) {
  // 1. Create a guest account for testing
  const guest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest);

  // 2. Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "moderator123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "basic",
        ip: "127.0.0.1",
        href: "https://example.com/dashboard",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Perform initial soft deletion of the guest account
  const firstDeletion: IDiscussionBoardGuest =
    await api.functional.discussionBoard.moderator.guests.erase(connection, {
      guestToken: guest.guest_token,
    });
  typia.assert(firstDeletion);

  // 4. Attempt to delete the same guest account again
  // This should handle the already-deleted state appropriately
  const secondDeletion: IDiscussionBoardGuest =
    await api.functional.discussionBoard.moderator.guests.erase(connection, {
      guestToken: guest.guest_token,
    });
  typia.assert(secondDeletion);

  // 5. Validate that the system handled the duplicate deletion appropriately
  // The guest record should maintain its deleted state
  TestValidator.equals(
    "guest ID should remain consistent",
    firstDeletion.id,
    secondDeletion.id,
  );
  TestValidator.equals(
    "guest token should remain consistent",
    firstDeletion.guest_token,
    secondDeletion.guest_token,
  );

  // Ensure the guest record is properly marked as deleted
  TestValidator.predicate(
    "guest should have deleted_at timestamp set",
    secondDeletion.deleted_at !== null &&
      secondDeletion.deleted_at !== undefined,
  );
}
