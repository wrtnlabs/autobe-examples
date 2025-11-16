import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorSession";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate that requesting a non-existent actor session as a todoAdmin
 * administrator does not succeed and does not return any session payload.
 *
 * Business context:
 *
 * - TodoAdmin operators can inspect actor sessions via GET
 *   /todoApp/todoAdmin/actors/sessions/{sessionId} for security and auditing
 *   purposes.
 * - When an admin queries a sessionId that does not exist in any of the
 *   underlying session tables, the system must fail the request rather than
 *   returning fabricated or misleading session data.
 *
 * This test covers the negative path where a validly authenticated admin calls
 * the detail endpoint with a random UUID that should not correspond to any real
 * session record.
 *
 * Steps:
 *
 * 1. Register a new todoAdmin account using POST /auth/todoAdmin/join, which also
 *    authenticates the connection by setting the Authorization header via the
 *    SDK.
 * 2. Generate a random UUID value to use as a non-existent sessionId.
 * 3. Invoke GET /todoApp/todoAdmin/actors/sessions/{sessionId} with this random
 *    UUID.
 * 4. Use TestValidator.error to assert that the call fails, ensuring that no
 *    ITodoAppActorSession instance is returned for the bogus sessionId.
 */
export async function test_api_todo_admin_actor_session_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a todoAdmin operator.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todoapp.example.com/register",
    referrer: "https://admin.todoapp.example.com/login",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin = await api.functional.auth.todoAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Generate a random UUID that should not match any real session.
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // 3 & 4. Expect an error when querying a non-existent session.
  await TestValidator.error(
    "requesting a non-existent actor session should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.actors.sessions.at(connection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
