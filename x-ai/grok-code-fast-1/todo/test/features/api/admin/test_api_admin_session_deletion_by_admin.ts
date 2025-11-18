import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Ensures an admin can permanently delete their session for
 * security/compliance.
 *
 * Workflow:
 *
 * 1. Register a new admin, establishing authentication and session context.
 * 2. Retrieve adminId from join response and sessionId from session info.
 * 3. Perform session deletion via erase endpoint (DELETE
 *    /todoList/admin/admins/{adminId}/sessions/{sessionId}).
 * 4. Attempt session deletion again—should error as session is already deleted.
 */
export async function test_api_admin_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized context and session info
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://admin.todo-list-system.com/register",
    referrer: "https://admin.todo-list-system.com/landing",
    ip: null,
  } satisfies ITodoListAdmin.ICreate;
  const authorized: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  TestValidator.predicate(
    "join grants admin id",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.predicate(
    "session info present",
    authorized.session !== undefined && authorized.session !== null,
  );
  // Extract adminId and sessionId
  const adminId = typia.assert<string & tags.Format<"uuid">>(authorized.id);
  const sessionId: string & tags.Format<"uuid"> =
    typia.assert<ITodoListAdminSession.ISummary>(authorized.session!).id;

  // 2. Delete the session for this admin
  await api.functional.todoList.admin.admins.sessions.erase(connection, {
    adminId,
    sessionId,
  });
  // 3. Attempting to delete again should now result in error (already deleted or non-existent)
  await TestValidator.error(
    "deleting already deleted session should error",
    async () => {
      await api.functional.todoList.admin.admins.sessions.erase(connection, {
        adminId,
        sessionId,
      });
    },
  );
}
