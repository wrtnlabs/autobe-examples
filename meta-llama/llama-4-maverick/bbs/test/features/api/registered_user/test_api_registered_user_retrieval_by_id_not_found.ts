import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_registered_user_retrieval_by_id_not_found(
  connection: api.IConnection,
) {
  // Create a registered user first to ensure authentication works
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser = await api.functional.auth.registered_user.join(
    connection,
    {
      body: registeredUserEmail,
    },
  );
  typia.assert(registeredUser);

  // Use a known non-existent UUID for testing
  const nonExistentUserId = "00000000-0000-0000-0000-000000000000";

  // Verify that retrieving non-existent user fails
  await TestValidator.error(
    "retrieving non-existent user should fail",
    async () => {
      await api.functional.discussionBoard.registeredUser.registeredUsers.at(
        connection,
        { userId: nonExistentUserId },
      );
    },
  );
}
