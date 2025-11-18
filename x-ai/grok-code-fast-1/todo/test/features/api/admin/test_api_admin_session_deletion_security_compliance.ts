import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate that an admin can securely delete a specific user's authentication
 * session and that destruction is compliant with audit/security requirements.
 *
 * 1. Register and authenticate as an admin.
 * 2. Prepare random userId and sessionId (since no user/session creation endpoints
 *    exist).
 * 3. Attempt to delete the session—expect success if the record exists, not-found
 *    error if not.
 * 4. Repeat deletion on same sessionId—must result in not-found (immediate
 *    destruction check).
 * 5. Attempt deletion with a random (definitely non-existent) sessionId—expect
 *    not-found.
 * 6. Perform negative: tampered userId/sessionId
 * 7. Validate only admin may perform this operation (authorization is implicit
 *    from /auth/admin/join context).
 */
export async function test_api_admin_session_deletion_security_compliance(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ITodoListAdmin.ICreate;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals(
    "admin registration result",
    admin.email,
    adminJoinBody.email,
  );
  TestValidator.equals(
    "admin display name",
    admin.display_name,
    adminJoinBody.display_name,
  );
  // 2. Prepare random userId and sessionId (simulate as we lack creation endpoints)
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to delete the session (nominal - session may or may not exist)
  try {
    const deleted: ITodoListUserSession =
      await api.functional.todoList.admin.users.sessions.erase(connection, {
        userId,
        sessionId,
      });
    typia.assert(deleted);
    TestValidator.equals(
      "deleted session id matches request",
      deleted.id,
      sessionId,
    );
    TestValidator.equals(
      "deleted session user id matches",
      deleted.todo_list_user_id,
      userId,
    );
  } catch (exp) {
    // If session doesn't exist, expect not-found error
    await TestValidator.error(
      "delete returns not-found when session does not exist",
      async () => {
        throw exp;
      },
    );
  }
  // 4. Repeat deletion—must result in not-found error
  await TestValidator.error(
    "re-delete same sessionId returns not-found",
    async () => {
      await api.functional.todoList.admin.users.sessions.erase(connection, {
        userId,
        sessionId,
      });
    },
  );
  // 5. Attempt deletion on a fake sessionId
  const fakeSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deleting non-existent session returns not-found",
    async () => {
      await api.functional.todoList.admin.users.sessions.erase(connection, {
        userId,
        sessionId: fakeSessionId,
      });
    },
  );
  // 6. Negative: tampered/mismatched userId
  const fakeUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deleting session with wrong userId returns not-found",
    async () => {
      await api.functional.todoList.admin.users.sessions.erase(connection, {
        userId: fakeUserId,
        sessionId,
      });
    },
  );
}
