import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_admin_delete_discussion_board_guest(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and authentication
  const adminJoinBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "password123",
    nickname: "AdminUser",
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Step 2: Create discussion board guest to delete
  const guestCreateBody = {
    nickname: `guest_${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IDiscussionBoardGuest.ICreate;

  const guest: IDiscussionBoardGuest =
    await api.functional.discussionBoard.discussionBoardGuests.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(guest);

  // Step 3: Delete the created guest by admin
  await api.functional.discussionBoard.admin.discussionBoardGuests.erase(
    connection,
    {
      discussionBoardGuestId: guest.id,
    },
  );
}
