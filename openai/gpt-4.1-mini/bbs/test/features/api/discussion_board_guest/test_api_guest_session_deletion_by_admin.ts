import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardGuest";

export async function test_api_guest_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers and obtains authorization token
  const adminJoinBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const adminAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Generate a guest session ID (UUID format)
  const guestSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Use the admin authorization to retrieve guest session details
  const guestSession: IDiscussionBoardDiscussionBoardGuest =
    await api.functional.discussionBoard.admin.discussionBoardGuests.at(
      connection,
      { discussionBoardGuestId: guestSessionId },
    );
  typia.assert(guestSession);

  // 4. Delete the existing guest session by ID
  await api.functional.discussionBoard.admin.discussionBoardGuests.erase(
    connection,
    {
      discussionBoardGuestId: guestSessionId,
    },
  );

  // 5. Attempt to retrieve the deleted guest session, should fail
  await TestValidator.error(
    "should not find deleted guest session",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardGuests.at(
        connection,
        {
          discussionBoardGuestId: guestSessionId,
        },
      );
    },
  );

  // 6. Attempt to delete a non-existent guest session, should fail
  const nonexistentGuestSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should fail deleting non-existent guest session",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardGuests.erase(
        connection,
        {
          discussionBoardGuestId: nonexistentGuestSessionId,
        },
      );
    },
  );
}
