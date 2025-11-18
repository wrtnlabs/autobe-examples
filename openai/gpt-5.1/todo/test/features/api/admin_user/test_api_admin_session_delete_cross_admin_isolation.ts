import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Verify cross-admin adminUser session deletion isolation and same-admin
 * success.
 *
 * Business intent:
 *
 * - Admin A must not be able to delete sessions that belong to Admin B.
 * - Admin B must be able to delete its own session via the same endpoint.
 *
 * Test strategy (within available APIs):
 *
 * 1. Create Admin A with POST /auth/adminUser/join, using a dedicated connection A
 *    so its Authorization header is isolated.
 * 2. Create Admin B with POST /auth/adminUser/join, using another connection B,
 *    isolating its Authorization header as well.
 * 3. While authenticated as Admin A (connA), attempt to DELETE a session for Admin
 *    B via /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId}.
 *    Expect this to fail with some authorization-related error, ensuring
 *    cross-admin isolation.
 * 4. While authenticated as Admin B (connB), call the same DELETE endpoint
 *    targeting its own adminUserId and a synthetic sessionId and expect it to
 *    succeed without error, validating the positive path.
 */
export async function test_api_admin_session_delete_cross_admin_isolation(
  connection: api.IConnection,
) {
  // Prepare two independent connections so that each admin keeps its own token.
  const connA: api.IConnection = { ...connection };
  const connB: api.IConnection = { ...connection };

  // 1. Create Admin A via join.
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connA, {
      body: adminAJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminA);

  // 2. Create Admin B via join.
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connB, {
      body: adminBJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminB);

  // 3. Negative path: Admin A attempts to delete a session belonging to Admin B.
  const sessionIdForAdminB = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "admin A cannot delete admin B session",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.erase(connA, {
        adminUserId: adminB.id,
        sessionId: sessionIdForAdminB,
      });
    },
  );

  // 4. Positive path: Admin B deletes its own session (synthetic session ID).
  const sessionIdForAdminBOwn = typia.random<string & tags.Format<"uuid">>();

  await api.functional.todoApp.adminUser.adminUsers.sessions.erase(connB, {
    adminUserId: adminB.id,
    sessionId: sessionIdForAdminBOwn,
  });
}
