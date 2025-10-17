import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IETodoListTodoStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoListTodoStatusFilter";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";

/**
 * Verify authentication is required for member Todo listing.
 *
 * Business goal: Ensure that listing member-owned Todos rejects unauthenticated
 * access and does not leak information about any member's Todos.
 *
 * Steps:
 *
 * 1. Build a valid ITodoListTodo.IRequest payload using typia.random for numeric
 *    constraints and RandomGenerator.pick for status.
 * 2. Create an unauthenticated connection by cloning the current connection and
 *    assigning empty headers: { ...connection, headers: {} }.
 * 3. If connection.simulate === true (SDK mock mode), call the API with the
 *    unauthenticated connection and just assert DTO shape using typia.assert,
 *    then return (auth is not enforced in simulate mode).
 * 4. Otherwise, expect an error to be thrown when calling the endpoint without
 *    authentication, using await TestValidator.error with an async callback.
 *
 * Important constraints:
 *
 * - Never assert specific HTTP status codes or error messages.
 * - Never mutate connection.headers directly beyond creating the empty-headers
 *   unauthenticated connection object.
 * - Always use satisfies for request body typing and await all API calls.
 */
export async function test_api_todo_member_todo_index_auth_required(
  connection: api.IConnection,
) {
  // 1) Build a valid request body
  const requestBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
    >(),
    status: RandomGenerator.pick(["all", "active", "completed"] as const),
  } satisfies ITodoListTodo.IRequest;

  // 2) Create an unauthenticated connection (do not touch headers afterwards)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Simulation mode: SDK returns random data regardless of auth
  if (connection.simulate === true) {
    const page: IPageITodoListTodo.ISummary =
      await api.functional.todoList.todoMember.todos.index(unauthConn, {
        body: requestBody,
      });
    typia.assert(page);
    return; // Exit early in simulate mode
  }

  // 4) Real backend: unauthenticated request must fail (no status code checks)
  await TestValidator.error(
    "member todo listing requires authentication",
    async () => {
      await api.functional.todoList.todoMember.todos.index(unauthConn, {
        body: requestBody,
      });
    },
  );
}
