import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminuserSession";

/**
 * Validate that admin session detail endpoint rejects requests with invalid
 * identifiers.
 *
 * Business goal:
 *
 * - Ensure that even an authenticated adminUser cannot retrieve session details
 *   for non-existent admin users or sessions, and that the server responds with
 *   an error instead of a successful ITodoAppAdminuserSession payload.
 * - This strengthens security by avoiding information leakage about which
 *   adminUser/session IDs exist while maintaining consistent not-found
 *   semantics.
 *
 * Test flow:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join using
 *    ITodoAppAdminUser.IJoin. This both creates the admin user in
 *    todo_app_adminusers and configures the connection with a valid
 *    Authorization header via the SDK.
 * 2. Generate a pair of random UUIDs for adminUserId and sessionId that are
 *    extremely unlikely to match any real records.
 * 3. Call GET /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId}
 *    through api.functional.todoApp.adminUser.adminUsers.sessions.at using
 *    those random IDs.
 * 4. Use TestValidator.error with an async callback to assert that the call fails
 *    (i.e., the backend responds with an HTTP error such as 404 Not Found). Do
 *    not inspect the HttpError.status or message; only the existence of an
 *    error matters.
 * 5. Optionally, generate another random UUID for sessionId while using the real
 *    adminUserId from the join result and perform the same call, again
 *    asserting that an error occurs because the sessionId does not exist for
 *    that admin user.
 *
 * Notes and constraints:
 *
 * - Do not attempt to manually manipulate connection.headers; token management is
 *   handled automatically by the SDK after join.
 * - All UUID values must be produced using typia.random with string &
 *   tags.Format<"uuid">.
 * - Do not attempt to create sessions explicitly or rely on any side effects
 *   beyond what is guaranteed by the provided APIs.
 * - Avoid any type-unsafe patterns such as `as any` and do not test with
 *   deliberately invalid types; focus purely on business-level not-found
 *   behavior using correctly typed identifiers.
 */
export async function test_api_adminuser_session_detail_invalid_ids(
  connection: api.IConnection,
) {
  // 1. Register a new admin user to establish authenticated admin context.
  const joinInput = typia.random<ITodoAppAdminUser.IJoin>();
  const adminUser = await api.functional.auth.adminUser.join(connection, {
    body: joinInput,
  });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminUser);

  // 2. First scenario: both adminUserId and sessionId are random UUIDs
  //    that should not correspond to any real records.
  const nonexistentAdminUserId = typia.random<string & tags.Format<"uuid">>();
  const nonexistentSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "requesting session detail with completely invalid adminUserId and sessionId must fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.at(
        connection,
        {
          adminUserId: nonexistentAdminUserId,
          sessionId: nonexistentSessionId,
        },
      );
    },
  );

  // 3. Second scenario: valid adminUserId from the joined admin, but a
  //    random non-existent sessionId should still result in an error.
  const anotherNonexistentSessionId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "requesting session detail with valid adminUserId but invalid sessionId must fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.at(
        connection,
        {
          adminUserId: adminUser.id,
          sessionId: anotherNonexistentSessionId,
        },
      );
    },
  );
}
