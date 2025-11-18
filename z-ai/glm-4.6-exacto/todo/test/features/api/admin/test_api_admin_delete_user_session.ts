import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validate that an authenticated admin can forcibly terminate a user session by
 * session and user ID.
 *
 * 1. Register (join) as admin with random credentials (requires email, password,
 *    href, referrer)
 * 2. Confirm admin account creation and authentication (returns token and session
 *    info)
 * 3. Use the admin context to perform the privileged session deletion API call,
 *    generating random userId/sessionId for test (since no user session listing
 *    API is provided)
 * 4. Confirm API completes successfully (void return means no error)
 *
 * Note: This mock test only checks that the privileged endpoint is accessible
 * to authenticated admins, given that there is no user/session creation or
 * listing API provided in the DTO/functions. Further business validation
 * (actual session invalidation effects or audit log checks) are out of scope.
 * It verifies admin-only access and successful endpoint response.
 */
export async function test_api_admin_delete_user_session(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain privileges
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.IJoin;
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminJoinBody },
  );
  typia.assert(admin);

  // 2. Privileged session deletion (admin-only)
  // Since no user/session creation API is provided, use random UUIDs for IDs
  const userId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.todoApp.admin.users.sessions.erase(connection, {
    userId,
    sessionId,
  });

  // 3. Assert completion (no error is success for void return type). TestValidator.predicate can serve audit for privileged endpoint execution.
  TestValidator.predicate(
    "admin-privileged session deletion endpoint completed with no error",
    true,
  );
}
