import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can successfully soft delete a guest account by setting
 * the deleted_at timestamp. This scenario validates the primary update
 * functionality for guest management. The test should authenticate as a
 * moderator, create a guest account, then update it with a deletion timestamp.
 * Verification should include checking that the guest record is properly
 * updated with the deletion timestamp while maintaining all other fields
 * unchanged.
 */
export async function test_api_guest_update_soft_delete(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator to establish authorization context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.paragraph({ sentences: 1 }),
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        bio: RandomGenerator.content({ paragraphs: 1 }),
        moderation_level: "admin",
        href: "https://discussionboard.example.com/moderator/register",
        referrer: "https://discussionboard.example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a guest account to be soft deleted
  const guest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest);

  // 3. Update the guest account with a deletion timestamp
  const currentTime = new Date().toISOString();
  const updatedGuest: IDiscussionBoardGuest =
    await api.functional.discussionBoard.moderator.guests.update(connection, {
      guestToken: guest.guest_token,
      body: {
        deleted_at: currentTime,
      } satisfies IDiscussionBoardGuest.IUpdate,
    });
  typia.assert(updatedGuest);

  // 4. Verify the guest record has the deletion timestamp while other fields remain unchanged
  TestValidator.equals("guest ID remains unchanged", updatedGuest.id, guest.id);
  TestValidator.equals(
    "guest token remains unchanged",
    updatedGuest.guest_token,
    guest.guest_token,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedGuest.created_at,
    guest.created_at,
  );
  TestValidator.predicate(
    "updated_at should be updated to current or later",
    new Date(updatedGuest.updated_at).getTime() >=
      new Date(guest.updated_at).getTime(),
  );
  TestValidator.equals(
    "deleted_at should be set to current time",
    updatedGuest.deleted_at,
    currentTime,
  );
  TestValidator.predicate(
    "deleted_at should be a valid date-time format",
    typia.is<string & tags.Format<"date-time">>(updatedGuest.deleted_at!),
  );
}
