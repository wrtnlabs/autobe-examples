import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieval of guest information for a soft-deleted guest account. This
 * test validates that soft-deleted guest records are still accessible to
 * moderators for audit and recovery purposes. The test follows a complete
 * workflow: authenticate as a moderator, create a guest account, soft-delete it
 * through the update endpoint, then attempt to retrieve the guest information.
 * Verification ensures that soft-deleted guest records are returned with the
 * appropriate deleted_at timestamp, demonstrating that soft deletion preserves
 * records for administrative access while marking them as deleted.
 *
 * Step-by-step implementation:
 *
 * 1. Authenticate as moderator to establish authorization context
 * 2. Create a guest account for testing soft deletion
 * 3. Soft delete the guest account through update endpoint
 * 4. Retrieve the soft-deleted guest information
 * 5. Validate that the guest record contains appropriate deleted_at timestamp
 * 6. Verify that other guest properties remain intact after soft deletion
 */
export async function test_api_guest_retrieval_soft_deleted(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator to establish authorization context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.paragraph({ sentences: 2 }),
        password: "moderator_password_123",
        display_name: RandomGenerator.paragraph({ sentences: 1 }),
        bio: RandomGenerator.content({ paragraphs: 1 }),
        moderation_level: RandomGenerator.pick([
          "basic",
          "senior",
          "admin",
        ] as const),
        href: "https://example.com/registration",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a guest account for testing soft deletion
  const guest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest);

  // 3. Soft delete the guest account through update endpoint
  const deletionTime = new Date().toISOString();
  const softDeletedGuest: IDiscussionBoardGuest =
    await api.functional.discussionBoard.moderator.guests.update(connection, {
      guestToken: guest.guest_token,
      body: {
        deleted_at: deletionTime,
      } satisfies IDiscussionBoardGuest.IUpdate,
    });
  typia.assert(softDeletedGuest);

  // 4. Retrieve the soft-deleted guest information
  const retrievedGuest: IDiscussionBoardGuest =
    await api.functional.discussionBoard.moderator.guests.at(connection, {
      guestToken: guest.guest_token,
    });
  typia.assert(retrievedGuest);

  // 5. Validate that the guest record contains appropriate deleted_at timestamp
  TestValidator.equals(
    "soft-deleted guest should have deleted_at timestamp",
    retrievedGuest.deleted_at,
    deletionTime,
  );

  // 6. Verify that other guest properties remain intact after soft deletion
  TestValidator.equals(
    "guest ID should remain unchanged after soft deletion",
    retrievedGuest.id,
    guest.id,
  );
  TestValidator.equals(
    "guest token should remain unchanged after soft deletion",
    retrievedGuest.guest_token,
    guest.guest_token,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    retrievedGuest.created_at,
    guest.created_at,
  );

  // Use appropriate validation for timestamp comparison
  TestValidator.predicate(
    "deleted_at timestamp should be properly set",
    retrievedGuest.deleted_at !== null &&
      retrievedGuest.deleted_at !== undefined,
  );
}
