import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_discussion_board_moderator_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1. Admin joins with valid unique email, password, and display name
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
    displayName: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Step 2. Delete a discussion board moderator with a valid UUID for moderator ID
  const moderatorId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.discussionBoard.admin.discussionBoardModerators.erase(
    connection,
    {
      discussionBoardModeratorId: moderatorId,
    },
  );
}
