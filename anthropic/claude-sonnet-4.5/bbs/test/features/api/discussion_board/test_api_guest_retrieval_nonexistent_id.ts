import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test guest retrieval with non-existent UUID.
 *
 * This test validates the system's error handling when a moderator attempts to
 * retrieve a guest record using a valid UUID format that doesn't correspond to
 * any existing guest in the discussion_board_guests table.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Generate a valid but non-existent guest UUID
 * 3. Attempt to retrieve the guest record
 * 4. Verify that the operation fails with an appropriate error
 */
export async function test_api_guest_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a non-existent guest UUID
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve guest with non-existent ID and verify error
  await TestValidator.error(
    "should fail when retrieving guest with non-existent UUID",
    async () => {
      await api.functional.discussionBoard.moderator.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
