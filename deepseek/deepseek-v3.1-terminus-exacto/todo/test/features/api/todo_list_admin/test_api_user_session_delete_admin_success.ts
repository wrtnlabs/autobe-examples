import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Verify that an administrator can delete a user session by userId and
 * sessionId.
 *
 * Scenario:
 *
 * 1. Register a random admin with valid credentials, assert correct authentication
 *    and token issuance.
 * 2. As admin, request deletion of a sessionId for a userId (both valid UUIDs),
 *    assert operation completes without error (void result).
 * 3. Attempt to delete the same user/session again, assert that a not found error
 *    (access violation or missing resource) occurs.
 * 4. Only administrators may perform this endpoint (enforced by prior registration
 *    and token acquisition).
 */
export async function test_api_user_session_delete_admin_success(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Generate random UUIDs for userId and sessionId
  const userId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete user session (as admin)
  await api.functional.todoList.admin.users.sessions.erase(connection, {
    userId,
    sessionId,
  });

  // 4. Attempt to delete again, expect not found error (resource is gone or access violation)
  await TestValidator.error(
    "delete on already-deleted user session returns error",
    async () => {
      await api.functional.todoList.admin.users.sessions.erase(connection, {
        userId,
        sessionId,
      });
    },
  );
}
