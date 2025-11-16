import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminSession";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate that requesting an admin session detail with an invalid sessionId
 * fails.
 *
 * Business goal
 *
 * - Ensure that the session-detail endpoint does not return a valid
 *   ITodoAppTodoAdminSession for a random/non-existent sessionId, even when the
 *   todoAdmin is valid and authenticated.
 * - Confirm normal admin behavior first by creating a Todo status, then exercise
 *   the not-found style path.
 *
 * Steps
 *
 * 1. Register a new todoAdmin via /auth/todoAdmin/join to obtain an authorized
 *    admin context (id + token attached to connection by SDK).
 * 2. Create a Todo status via /todoApp/todoAdmin/todoStatuses to validate that the
 *    admin is properly authenticated and that privileged admin APIs work.
 * 3. Generate a random UUID value that is extremely unlikely to match any real
 *    session id.
 * 4. While authenticated as this admin, call GET
 *    /todoApp/todoAdmin/todoAdmins/{todoAdminId}/sessions/{sessionId} using the
 *    real admin id and the random sessionId.
 * 5. Use TestValidator.error to assert that the call fails (business-level
 *    not-found style error). Do not check concrete HTTP status codes; only
 *    verify that an error is thrown.
 */
export async function test_api_todoadmin_session_detail_not_found_for_invalid_session(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: "https://admin.todo-app.example.com/join",
    referrer: "https://admin.todo-app.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a Todo status as a sanity check for authenticated admin behavior
  const statusBody = {
    code: `STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert(createdStatus);

  // Basic sanity assertion: created status code must match request
  TestValidator.equals(
    "created status code should equal requested code",
    createdStatus.code,
    statusBody.code,
  );

  // 3. Generate a random UUID that should not correspond to any existing session
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();

  // 4-5. Request session detail with invalid sessionId and expect failure
  await TestValidator.error(
    "requesting admin session detail with invalid sessionId should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.sessions.at(
        connection,
        {
          todoAdminId: admin.id,
          sessionId: invalidSessionId,
        },
      );
    },
  );
}
