import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validates idempotent behavior and error handling when deleting a non-existent
 * or already-deleted admin session.
 *
 * This test ensures that when attempting to delete an admin session specified
 * by a valid adminId and a sessionId that does not correspond to any existing
 * session for that admin (either because it never existed or was previously
 * deleted), an appropriate error is returned and no side effects occur. The
 * admin account and unrelated sessions must remain unaffected.
 *
 * Steps:
 *
 * 1. Register a new admin with unique registration data.
 * 2. Attempt to delete a session for the adminId using a random, non-existent
 *    sessionId (UUID).
 * 3. Confirm the system throws an error for this operation, proving no session
 *    exists to delete.
 * 4. Optionally, validate that the admin account is still valid/active if possible
 *    with available APIs.
 */
export async function test_api_admin_session_delete_idempotent_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // Step 2: Try to delete a non-existent session for this admin
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting a non-existent session for valid adminId should throw error",
    async () => {
      await api.functional.discussionBoard.admin.admins.sessions.erase(
        connection,
        {
          adminId: admin.id,
          sessionId: randomSessionId,
        },
      );
    },
  );

  // Step 3: Optionally, confirm admin account is still valid and unchanged (token, id, etc.)
  //         Since available API does not provide further validation endpoints, this step is not implemented but left as a comment for completeness.
}
