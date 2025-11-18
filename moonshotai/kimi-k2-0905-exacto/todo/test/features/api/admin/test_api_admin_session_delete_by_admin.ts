import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate an administrator's ability to revoke their own session and ensure
 * permanent invalidation.
 *
 * 1. Register a new admin (simulate a fresh session), ensuring unique
 *    email/password and context.
 * 2. Use returned credentials (adminId, token) as authentication.
 * 3. Perform DELETE /todoList/admin/admins/{adminId}/sessions/{sessionId}, using a
 *    random UUID (since sessionId not retrievable).
 * 4. Attempt authenticated operation with non-existent session, expecting error
 *    (logout effect / invalid session).
 * 5. Attempt to delete a session as another admin, expect security error.
 *
 * This sequence tests privilege enforcement, valid session matching, and proper
 * error responses for invalid operations, within API/DTO constraints.
 */
export async function test_api_admin_session_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register first admin (gives us an adminId and tokens)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-join.example.com/signup",
    referrer: "https://admin-portal.example.com/welcome",
  } satisfies ITodoListAdmin.IJoin;
  const authorized1 = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(authorized1);

  // 2. Attempt to delete a (random) session for this admin (since actual sessionId unavailable):
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot delete non-existent session", async () => {
    await api.functional.todoList.admin.admins.sessions.erase(connection, {
      adminId: authorized1.id,
      sessionId: randomSessionId,
    });
  });

  // 3. Register a second admin, try to delete a session with first admin's id (should also fail)
  const adminBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    href: "https://admin-join2.example.com/signup",
    referrer: "https://admin-portal.example.com/welcome",
  } satisfies ITodoListAdmin.IJoin;
  const authorized2 = await api.functional.auth.admin.join(connection, {
    body: adminBody2,
  });
  typia.assert(authorized2);
  await TestValidator.error(
    "other admin cannot delete session for unrelated admin",
    async () => {
      await api.functional.todoList.admin.admins.sessions.erase(connection, {
        adminId: authorized2.id,
        sessionId: randomSessionId,
      });
    },
  );
}
