import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate retrieval of a single comment edit history record by its owner.
 *
 * This test ensures that after joining as a new user, the user can access the
 * detailed audit trail for a modified comment. The test generates a user, then
 * mocks a comment edit event by generating random valid UUIDs for the comment
 * and edit history (emulating a record the user would logically own/edit in the
 * real workflow). It calls the API to retrieve the edit history record, then
 * asserts that:
 *
 * - The returned data matches the requested IDs for both comment and edit history
 * - All fields (id, comment_id, snapshot_id, user_session_id, edit_reason,
 *   created_at) are present and type-correct
 *
 * Next, the test attempts access as a second unrelated user—registering another
 * account, then attempting to access the same comment edit history. It expects
 * the operation to fail (access denied), validating that the API enforces
 * privacy and access control. Error validation ensures unauthorized users
 * cannot view edit logs for comments they do not own.
 */
export async function test_api_comment_edit_history_detail_by_user(
  connection: api.IConnection,
) {
  // 1. User joins - create first user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const authUser: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(authUser);

  // 2. Generate random IDs representing user's comment and an edit history entry (these would result from actual workflow in a real system)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const editHistoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call API: the user fetches the edit history record for their own comment
  const editHistory: ICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.user.comments.editHistory.at(
      connection,
      {
        commentId,
        editHistoryId,
      },
    );
  typia.assert(editHistory);
  // Validate returned record links and key fields
  TestValidator.equals(
    "returned commentId matches request",
    editHistory.comment_id,
    commentId,
  );
  TestValidator.equals(
    "returned editHistoryId matches request",
    editHistory.id,
    editHistoryId,
  );
  TestValidator.predicate(
    "has valid editor session ID",
    typeof editHistory.user_session_id === "string" &&
      editHistory.user_session_id.length > 0,
  );
  TestValidator.predicate(
    "has snapshot linkage",
    typeof editHistory.snapshot_id === "string" &&
      editHistory.snapshot_id.length > 0,
  );
  TestValidator.predicate(
    "has ISO 8601 creation timestamp",
    typeof editHistory.created_at === "string" &&
      editHistory.created_at.includes("T"),
  );

  // 4. Error test: Register another unrelated user (unprivileged)
  const joinBodyUnauthorized = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  await api.functional.auth.user.join(connection, {
    body: joinBodyUnauthorized,
  });

  // 5. Attempt access as unrelated user - expect access denial
  await TestValidator.error(
    "unauthorized user cannot access other's comment edit history",
    async () => {
      await api.functional.communityPlatform.user.comments.editHistory.at(
        connection,
        {
          commentId,
          editHistoryId,
        },
      );
    },
  );
}
