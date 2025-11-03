import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

export async function test_api_discussion_board_admins_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin with join API
  const joined: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `${RandomGenerator.name(2).replace(/\s+/g, "")}@example.com`,
        password: "StrongPassword123!",
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(joined);

  // Save original admin id and created_at, updated_at
  const adminId = joined.id;
  const originalCreatedAt = joined.created_at;
  const originalUpdatedAt = joined.updated_at;

  // 2. Update the admin email
  const newEmail = `${RandomGenerator.name(2).replace(/\s+/g, "")}@example.com`;

  const updatedAdmin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.update(
      connection,
      {
        discussionBoardAdminId: adminId,
        body: {
          email: newEmail,
        } satisfies IDiscussionBoardAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin);

  // 3. Validate that the id remains same
  TestValidator.equals(
    "admin id should remain unchanged",
    updatedAdmin.id,
    adminId,
  );

  // 4. Validate the email has been updated
  TestValidator.equals(
    "admin email should be updated",
    updatedAdmin.email,
    newEmail,
  );

  // 5. Validate timestamps remain timestamps
  TestValidator.predicate(
    "created_at is ISO8601",
    typeof updatedAdmin.created_at === "string" &&
      updatedAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO8601",
    typeof updatedAdmin.updated_at === "string" &&
      updatedAdmin.updated_at.length > 0,
  );

  // 6. Optionally, updated_at is later than or equal to original updated_at
  const originalUpdatedTime = Date.parse(originalUpdatedAt);
  const newUpdatedTime = Date.parse(updatedAdmin.updated_at);
  TestValidator.predicate(
    "updated_at is not earlier than before",
    newUpdatedTime >= originalUpdatedTime,
  );

  // 7. deleted_at can be null or undefined (is soft deletion timestamp)
  TestValidator.predicate(
    "deleted_at is null or undefined",
    updatedAdmin.deleted_at === null || updatedAdmin.deleted_at === undefined,
  );

  // 8. discussion_board_admin_sessions is an array (possibly empty or undefined)
  TestValidator.predicate(
    "discussion_board_admin_sessions is array or undefined",
    updatedAdmin.discussion_board_admin_sessions === undefined ||
      (Array.isArray(updatedAdmin.discussion_board_admin_sessions) &&
        updatedAdmin.discussion_board_admin_sessions.every(
          (sess) => typeof sess === "object",
        )),
  );
}
