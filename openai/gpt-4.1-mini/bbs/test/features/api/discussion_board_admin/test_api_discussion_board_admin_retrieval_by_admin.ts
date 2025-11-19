import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_discussion_board_admin_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin user by calling the join API
  const adminJoinBody = {
    email:
      `admin${RandomGenerator.alphaNumeric(6)}@example.com` satisfies string &
        tags.Format<"email">,
    password: "SecureP@ssw0rd123",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const authenticatedAdmin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(authenticatedAdmin);

  // 2. Create a new discussion board admin user
  const newAdminBody = {
    email:
      `user${RandomGenerator.alphaNumeric(6)}@example.com` satisfies string &
        tags.Format<"email">,
    password: "AnotherSecureP@ss1",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.ICreate;

  const newAdmin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.create(
      connection,
      { body: newAdminBody },
    );
  typia.assert(newAdmin);

  // 3. Retrieve the new admin's detailed information by ID
  const detailedAdmin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.at(
      connection,
      { discussionBoardAdminId: newAdmin.id },
    );
  typia.assert(detailedAdmin);

  // 4. Validate that retrieved details match creation
  TestValidator.equals("admin ID matches", detailedAdmin.id, newAdmin.id);
  TestValidator.equals(
    "admin email matches",
    detailedAdmin.email,
    newAdmin.email,
  );
  TestValidator.equals(
    "admin nickname matches",
    detailedAdmin.nickname,
    newAdmin.nickname,
  );
  TestValidator.equals(
    "created_at timestamps matches",
    detailedAdmin.created_at,
    newAdmin.created_at,
  );
  TestValidator.equals(
    "updated_at timestamps matches",
    detailedAdmin.updated_at,
    newAdmin.updated_at,
  );
  TestValidator.equals(
    "deleted_at is same",
    detailedAdmin.deleted_at ?? null,
    newAdmin.deleted_at ?? null,
  );
}
