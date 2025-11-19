import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can restore a soft-deleted guest account by setting
 * deleted_at to undefined. This scenario validates the guest recovery
 * functionality for administrative purposes.
 */
export async function test_api_guest_update_restore_deleted(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "admin",
      ip: "127.0.0.1",
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create guest account
  const guest = await api.functional.auth.guest.join(connection);
  typia.assert(guest);

  // Step 3: Soft-delete the guest account
  const softDeletedGuest =
    await api.functional.discussionBoard.moderator.guests.update(connection, {
      guestToken: guest.guest_token,
      body: {
        deleted_at: new Date().toISOString(),
      } satisfies IDiscussionBoardGuest.IUpdate,
    });
  typia.assert(softDeletedGuest);
  TestValidator.predicate(
    "guest should be soft-deleted",
    softDeletedGuest.deleted_at !== undefined,
  );

  // Step 4: Restore the guest account by setting deleted_at to undefined
  const restoredGuest =
    await api.functional.discussionBoard.moderator.guests.update(connection, {
      guestToken: guest.guest_token,
      body: {
        deleted_at: undefined,
      } satisfies IDiscussionBoardGuest.IUpdate,
    });
  typia.assert(restoredGuest);
  TestValidator.predicate(
    "guest should be restored (deleted_at should be undefined)",
    restoredGuest.deleted_at === undefined,
  );

  // Step 5: Verify the guest can be retrieved normally
  TestValidator.equals("guest ID should match", restoredGuest.id, guest.id);
  TestValidator.equals(
    "guest token should match",
    restoredGuest.guest_token,
    guest.guest_token,
  );
  TestValidator.predicate(
    "created_at should be preserved",
    restoredGuest.created_at === guest.created_at,
  );
}
