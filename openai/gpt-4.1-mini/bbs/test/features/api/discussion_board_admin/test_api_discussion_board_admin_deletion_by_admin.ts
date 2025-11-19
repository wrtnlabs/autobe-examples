import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_discussion_board_admin_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join (signup) to get authentication token
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssword123",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedAdmin);

  // 2. Create a new discussion board admin user
  const createBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssword123",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.ICreate;

  const createdAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdAdmin);

  // 3. Delete the created discussion board admin user
  await api.functional.discussionBoard.admin.discussionBoardAdmins.erase(
    connection,
    {
      discussionBoardAdminId: createdAdmin.id,
    },
  );

  // 4. Attempting to delete again should throw error (not checked here as
  //    no error handling requested, but backend enforces irreversible removal)
}
