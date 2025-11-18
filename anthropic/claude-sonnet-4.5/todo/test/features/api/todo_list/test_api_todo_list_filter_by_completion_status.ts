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
 * Test filtering todos by completion status using the status parameter.
 *
 * Creates a user account and populates it with both completed and incomplete
 * todo items by creating todos and marking some as completed using the update
 * endpoint. Tests three filtering scenarios: (1) status='completed' to retrieve
 * only finished tasks, (2) status='incomplete' to retrieve only pending tasks,
 * and (3) status=null or omitted to retrieve all todos regardless of completion
 * status. Verifies that each filter returns the correct subset of todos based
 * on their completed field.
 *
 * This validates the core task organization feature that allows users to focus
 * on pending work or review completed items.
 */
export async function test_api_todo_list_filter_by_completion_status(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for todo ownership and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todo items in incomplete state
  const todo1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Complete project documentation",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo1);

  const todo2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Review pull requests",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo2);

  const todo3: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Update dependencies",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo3);

  const todo4: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Write unit tests",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo4);

  const todo5: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Fix reported bugs",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo5);

  // Step 3: Mark some todos as completed to create mixed completion states
  const completedTodo1: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo1.id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(completedTodo1);

  const completedTodo3: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo3.id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(completedTodo3);

  // Step 4: Test filtering for completed todos only (status='completed')
  const completedPage: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "completed",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(completedPage);

  TestValidator.equals(
    "completed filter should return exactly 2 todos",
    completedPage.data.length,
    2,
  );

  TestValidator.predicate(
    "all returned todos should be completed",
    completedPage.data.every((todo) => todo.completed === true),
  );

  const completedIds = completedPage.data.map((todo) => todo.id);
  TestValidator.predicate(
    "completed filter should include todo1",
    completedIds.includes(completedTodo1.id),
  );
  TestValidator.predicate(
    "completed filter should include todo3",
    completedIds.includes(completedTodo3.id),
  );

  // Step 5: Test filtering for incomplete todos only (status='incomplete')
  const incompletePage: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "incomplete",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(incompletePage);

  TestValidator.equals(
    "incomplete filter should return exactly 3 todos",
    incompletePage.data.length,
    3,
  );

  TestValidator.predicate(
    "all returned todos should be incomplete",
    incompletePage.data.every((todo) => todo.completed === false),
  );

  const incompleteIds = incompletePage.data.map((todo) => todo.id);
  TestValidator.predicate(
    "incomplete filter should include todo2",
    incompleteIds.includes(todo2.id),
  );
  TestValidator.predicate(
    "incomplete filter should include todo4",
    incompleteIds.includes(todo4.id),
  );
  TestValidator.predicate(
    "incomplete filter should include todo5",
    incompleteIds.includes(todo5.id),
  );

  // Step 6: Test retrieving all todos (status=null)
  const allTodosPage: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: null,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(allTodosPage);

  TestValidator.equals(
    "no filter should return all 5 todos",
    allTodosPage.data.length,
    5,
  );

  const allIds = allTodosPage.data.map((todo) => todo.id);
  TestValidator.predicate(
    "all filter should include todo1",
    allIds.includes(todo1.id),
  );
  TestValidator.predicate(
    "all filter should include todo2",
    allIds.includes(todo2.id),
  );
  TestValidator.predicate(
    "all filter should include todo3",
    allIds.includes(todo3.id),
  );
  TestValidator.predicate(
    "all filter should include todo4",
    allIds.includes(todo4.id),
  );
  TestValidator.predicate(
    "all filter should include todo5",
    allIds.includes(todo5.id),
  );

  // Step 7: Test retrieving all todos (status omitted)
  const allTodosPageOmitted: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(allTodosPageOmitted);

  TestValidator.equals(
    "omitted status should return all 5 todos",
    allTodosPageOmitted.data.length,
    5,
  );
}
