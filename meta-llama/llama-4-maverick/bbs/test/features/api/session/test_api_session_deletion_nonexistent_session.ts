import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_session_deletion_nonexistent_session(
  connection: api.IConnection,
) {
  // Create a new registered user account
  const registeredUser: IDiscussionBoardRegisteredUser.IAuthorized =
    await api.functional.auth.registered_user.join(connection, {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    });
  typia.assert(registeredUser);

  // Attempt to delete a non-existent session
  await TestValidator.error(
    "deleting non-existent session should fail",
    async () =>
      await api.functional.discussionBoard.registeredUser.registeredUsers.sessions.erase(
        connection,
        {
          userId: registeredUser.id,
          sessionId: typia.random<string & tags.Format<"uuid">>(), // Non-existent session ID
        },
      ),
  );
}
