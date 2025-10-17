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
 * Validates the listing of Todo items for an authenticated user.
 *
 * This test covers:
 *
 * 1. User registration and authentication
 * 2. Creating several user-owned Todo items
 * 3. Paginated, sorted, and filtered retrieval via the /todoList/user/todos
 *    endpoint (PATCH)
 * 4. Validation that only the authenticated user's Todos are listed
 * 5. Verification of result data, pagination fields, and correct filtering
 */
export async function test_api_index_todos_list_basic_workflow(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const auth: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: { email, password } satisfies ITodoListUser.IJoin,
    },
  );
  typia.assert(auth);
  TestValidator.predicate(
    "registered user id should be uuid",
    /[0-9a-f\-]{36}/.test(auth.id),
  );
  TestValidator.predicate(
    "token must contain access",
    typeof auth.token.access === "string",
  );

  // 2. Create Todos for the user
  const TODOS_COUNT = 5;
  const todoSeeds = ArrayUtil.repeat(
    TODOS_COUNT,
    (i) =>
      ({
        title: `Test Todo ${i + 1}`,
        description: `Description ${i + 1}`,
      }) satisfies ITodoListTodo.ICreate,
  );

  const userTodos: ITodoListTodo[] = [];
  for (const body of todoSeeds) {
    const todo = await api.functional.todoList.user.todos.create(connection, {
      body,
    });
    typia.assert(todo);
    // All Todos must be incomplete (completed === false) at creation
    TestValidator.equals(
      `created todo ${todo.title} is not completed`,
      todo.completed,
      false,
    );
    userTodos.push(todo);
  }

  // 3. List Todos - default (no filters)
  const pageResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(pageResult);
  TestValidator.equals(
    "pagination limit positive",
    pageResult.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination page is valid",
    pageResult.pagination.current >= 0,
    true,
  );
  TestValidator.predicate(
    "data should not be empty",
    pageResult.data.length > 0,
  );
  // Confirm that only created Todos exist in the results
  userTodos.forEach((todo) => {
    TestValidator.predicate(
      `todo with id ${todo.id} is listed`,
      pageResult.data.some((row) => row.id === todo.id),
    );
  });

  // 4. List Todos - filter by completed=false (all should be incomplete)
  const pageResultIncomplete = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: { completed: false } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(pageResultIncomplete);
  pageResultIncomplete.data.forEach((todo) => {
    TestValidator.equals("todo is not completed", todo.completed, false);
  });

  // 5. List Todos - filter by search (use a substring from title)
  const searchTodo = userTodos[0];
  const searchKeyword = searchTodo.title.substring(2, 7); // partial, to check search support
  const searchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: { search: searchKeyword } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search yields at least one match",
    searchResult.data.length > 0,
  );
  TestValidator.predicate(
    "at least one todo title/description matches search",
    searchResult.data.some(
      (todo) =>
        todo.title.includes(searchKeyword) ||
        (todo.description ?? "").includes(searchKeyword),
    ),
  );

  // 6. List Todos - ordering and pagination
  const pageLimited = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        limit: 3,
        page: 1,
        sort_by: "created_at",
        order: "desc",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(pageLimited);
  TestValidator.equals("page limit respected", pageLimited.data.length, 3);
  TestValidator.predicate(
    "all listed are user todos",
    pageLimited.data.every((row) => userTodos.some((t) => t.id === row.id)),
  );
  // Confirm ordering (created_at desc)
  for (let i = 1; i < pageLimited.data.length; ++i) {
    TestValidator.predicate(
      `todos are sorted by created_at desc (idx ${i})`,
      pageLimited.data[i - 1].created_at >= pageLimited.data[i].created_at,
    );
  }
}
