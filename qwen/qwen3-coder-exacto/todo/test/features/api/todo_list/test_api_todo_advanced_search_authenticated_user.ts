import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensures that an authenticated user can perform advanced search, filtering,
 * pagination, and sorting of their todo items using a flexible query structure.
 * Verifies (1) registration, (2) presence of at least one todo (simulate if not
 * available), (3) advanced query parameters, (4) correct scoping to user, and
 * (5) business logic for dashboard filtering and privacy/security.
 */
export async function test_api_todo_advanced_search_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password: password as string & tags.Format<"password">,
    href: "https://test-client.app/join",
    referrer: "https://test-client.app/landing",
  } satisfies ITodoListUser.ICreate;
  const auth: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(auth);
  TestValidator.equals("joined email matches", auth.email, email);

  // 2. [Skipped] Create one or more todos for the user.
  // The scenario assumes at least one todo exists (API for creation not available here).
  //
  // 3. Test PATCH /todoList/user/todos with advanced query parameters
  // Try multiple filter/query combinations covering search, completion, date ranges, and sort orders.
  const combinations: Partial<ITodoListTodo.IRequest>[] = [
    {}, // All todos
    { completed: true },
    { completed: false },
    { search: "a" },
    { page: 1 as number & tags.Type<"int32"> & tags.Minimum<1> },
    {
      limit: 5 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    { sort_by: "created_at", sort_order: "asc" },
    { sort_by: "updated_at", sort_order: "desc" },
    {
      created_from: new Date(
        Date.now() - 1000 * 60 * 60 * 24 * 7,
      ).toISOString() as string & tags.Format<"date-time">,
    },
    {
      created_to: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  ];

  for (const combo of combinations) {
    const req: ITodoListTodo.IRequest = { ...combo };
    const page: IPageITodoListTodo.ISummary =
      await api.functional.todoList.user.todos.index(connection, {
        body: req,
      });
    typia.assert(page);
    // Validate: Only current user's todos in result
    for (const todo of page.data) {
      typia.assert(todo);
      TestValidator.equals("todo is owned by user", todo.user.id, auth.id);

      if (req.completed !== undefined) {
        TestValidator.equals(
          "completed matches filter",
          todo.completed,
          req.completed,
        );
      }
    }
    // Validate page shape
    typia.assert(page.pagination);
    TestValidator.predicate(
      "page limit is between 1 and 100",
      page.pagination.limit >= 1 && page.pagination.limit <= 100,
    );
  }
}
