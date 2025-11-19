import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_discussion_board_admin_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new admin by joining (initial authentication)
  const joinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "StrongPass123!",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const joined: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joined);

  // 2. Create discussion board admin
  const createBody = {
    email: `admin_create_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "AnotherStrongPass!",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.ICreate;

  const created: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // 3. Update discussion board admin's email and nickname
  const updateBody = {
    email: `updated_${RandomGenerator.alphaNumeric(5)}@example.com`,
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IUpdate;

  const updated: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.update(
      connection,
      {
        discussionBoardAdminId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validation
  TestValidator.equals(
    "updated email matches",
    updated.email,
    updateBody.email,
  );
  TestValidator.equals(
    "updated nickname matches",
    updated.nickname,
    updateBody.nickname,
  );
  TestValidator.equals("id remains unchanged", updated.id, created.id);
}
