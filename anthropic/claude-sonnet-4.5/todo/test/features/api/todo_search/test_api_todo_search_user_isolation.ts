import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_search_user_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userAEmail,
        password: "password123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    },
  );
  typia.assert(userA);

  // Step 2: Create todos for user A
  const userATodo1: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "User A - Personal Task 1",
        description: "This is user A's first todo item",
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(userATodo1);

  const userATodo2: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "User A - Personal Task 2",
        description: "This is user A's second todo item",
        status: "complete",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(userATodo2);

  // Step 3: Create second user account with fresh connection
  const userBConnection: api.IConnection = { ...connection, headers: {} };
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    userBConnection,
    {
      body: {
        email: userBEmail,
        password: "password456",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    },
  );
  typia.assert(userB);

  // Step 4: Create todos for user B
  const userBTodo1: ITodoListTodo =
    await api.functional.todoList.user.todos.create(userBConnection, {
      body: {
        title: "User B - Different Task 1",
        description: "This is user B's first todo item",
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(userBTodo1);

  const userBTodo2: ITodoListTodo =
    await api.functional.todoList.user.todos.create(userBConnection, {
      body: {
        title: "User B - Different Task 2",
        description: "This is user B's second todo item",
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(userBTodo2);

  // Step 5: User A searches for todos (using original connection)
  const userAResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "all",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userAResults);

  // Step 6: Validate user A only sees their own todos
  TestValidator.equals(
    "user A should see exactly 2 todos",
    userAResults.data.length,
    2,
  );

  const userAHasOwnTodos = userAResults.data.every(
    (todo) => todo.todo_list_user_id === userA.id,
  );
  TestValidator.predicate(
    "all user A results must belong to user A",
    userAHasOwnTodos,
  );

  const userAHasUserBTodos = userAResults.data.some(
    (todo) => todo.todo_list_user_id === userB.id,
  );
  TestValidator.predicate(
    "user A should not see any of user B's todos",
    !userAHasUserBTodos,
  );

  // Step 7: User B searches for todos (using userB connection)
  const userBResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(userBConnection, {
      body: {
        status: "all",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userBResults);

  // Step 8: Validate user B only sees their own todos
  TestValidator.equals(
    "user B should see exactly 2 todos",
    userBResults.data.length,
    2,
  );

  const userBHasOwnTodos = userBResults.data.every(
    (todo) => todo.todo_list_user_id === userB.id,
  );
  TestValidator.predicate(
    "all user B results must belong to user B",
    userBHasOwnTodos,
  );

  const userBHasUserATodos = userBResults.data.some(
    (todo) => todo.todo_list_user_id === userA.id,
  );
  TestValidator.predicate(
    "user B should not see any of user A's todos",
    !userBHasUserATodos,
  );
}
