import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardGuest";

export async function test_api_discussion_board_admin_discussion_board_guest_update(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "test-password",
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Prepare update data
  const discussionBoardGuestId = typia.random<string & tags.Format<"uuid">>();
  const newSessionToken = RandomGenerator.alphaNumeric(20);
  const deletedAt: string | null =
    Math.random() < 0.5 ? null : new Date(Date.now() - 3600000).toISOString();
  const updateBody = {
    session_token: newSessionToken,
    deleted_at: deletedAt,
  } satisfies IDiscussionBoardDiscussionBoardGuest.IUpdate;

  // 3. Perform update call
  const updatedGuest: IDiscussionBoardDiscussionBoardGuest =
    await api.functional.discussionBoard.admin.discussionBoardGuests.update(
      connection,
      {
        discussionBoardGuestId,
        body: updateBody,
      },
    );
  typia.assert(updatedGuest);

  // 4. Assertions
  TestValidator.equals(
    "session token should be updated",
    updatedGuest.session_token,
    newSessionToken,
  );
  TestValidator.predicate(
    "updated_at should be recent ISO string",
    typeof updatedGuest.updated_at === "string" &&
      !isNaN(Date.parse(updatedGuest.updated_at)),
  );
  if (
    updatedGuest.deleted_at !== null &&
    updatedGuest.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at should be valid ISO string or null",
      typeof updatedGuest.deleted_at === "string" &&
        !isNaN(Date.parse(updatedGuest.deleted_at)),
    );
  } else {
    TestValidator.equals(
      "deleted_at should be null",
      updatedGuest.deleted_at,
      null,
    );
  }

  // 5. Test unauthorized update fails
  await TestValidator.error("unauthorized update should throw", async () => {
    // Use a connection without authentication headers (simulate unauthenticated)
    const unauthConn: api.IConnection = { ...connection, headers: {} };
    await api.functional.discussionBoard.admin.discussionBoardGuests.update(
      unauthConn,
      {
        discussionBoardGuestId,
        body: updateBody,
      },
    );
  });

  // 6. Test update for non-existent guest session throws
  await TestValidator.error(
    "update non-existent guest session should throw",
    async () => {
      // Use a random UUID that likely does not exist
      await api.functional.discussionBoard.admin.discussionBoardGuests.update(
        connection,
        {
          discussionBoardGuestId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
