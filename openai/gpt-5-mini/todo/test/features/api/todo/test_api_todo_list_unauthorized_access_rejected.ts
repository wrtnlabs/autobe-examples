import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test: unauthenticated access to PATCH /todoApp/user/todos must be rejected.
 *
 * Purpose:
 *
 * - Ensure that the user-scoped todo listing endpoint does not accept
 *   unauthenticated requests and returns an authentication error (401 or 403).
 * - Use a minimal valid request body so that failure is attributable to
 *   authentication and not to request-shape validation.
 *
 * Steps:
 *
 * 1. Build an unauthenticated connection by copying the provided connection and
 *    assigning empty headers: { ...connection, headers: {} }.
 * 2. Prepare a minimal, valid ITodoAppTodo.IRequest body: { page: 1, pageSize: 10
 *    }.
 * 3. Call api.functional.todoApp.user.todos.index(...) and expect an HttpError
 *    with status 401 or 403 using TestValidator.httpError.
 */
export async function test_api_todo_list_unauthorized_access_rejected(
  connection: api.IConnection,
) {
  // 1) Create an unauthenticated clone of the incoming connection. Per
  //    SDK guidance, creating a shallow copy with empty headers is the
  //    supported pattern for unauthenticated requests. Do NOT mutate the
  //    original connection.headers.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Minimal valid request body to ensure server rejects due to auth, not
  //    parameter validation. Use `satisfies` to guarantee type compatibility.
  const requestBody = { page: 1, pageSize: 10 } satisfies ITodoAppTodo.IRequest;

  // 3) Expect an HTTP auth error (401 or 403). Use TestValidator.httpError
  //    which accepts expected status code(s) and an async task.
  await TestValidator.httpError(
    "unauthenticated request to user todos should be rejected",
    [401, 403],
    async () => {
      await api.functional.todoApp.user.todos.index(unauthConn, {
        body: requestBody,
      });
    },
  );
}
