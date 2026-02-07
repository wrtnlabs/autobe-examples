import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_completion_filtering_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Create a mix of completed and incomplete todos
  const todoCount = RandomGenerator.pick([3, 4, 5] as const);
  const completedCount = RandomGenerator.pick([1, 2] as const);
  const todoIds: string[] = [];
  for (let i = 0; i < todoCount; i++) {
    // Create todo with required title
    await api.functional.todoApp.user.todos.create(userConnection);
    // Since create returns void, we need to retrieve the todos to get their IDs
    const todosResponse =
      await api.functional.todoApp.user.todos.index(userConnection);
    typia.assert(todosResponse);
    // Get the most recently created todo (should be the one we just created)
    const latestTodo = todosResponse.data[todosResponse.data.length - 1];
    TestValidator.predicate("latest todo exists", !!latestTodo);
    todoIds.push(latestTodo.id);
    // Mark some todos as completed
    if (i < completedCount) {
      const updatedTodo =
        await api.functional.todoApp.user.todos.completions.updateCompletion(
          userConnection,
          {
            todoId: latestTodo.id,
            body: { completed: true } satisfies ITodoAppTodo.ICompletionUpdate,
          },
        );
      typia.assert(updatedTodo);
      TestValidator.equals(
        "todo marked as complete",
        updatedTodo.completion_status,
        "complete",
      );
    }
  }
  // Step 3: Test filtering by completion status
  // Test 1: Get all todos (default/no filter)
  const allTodosResponse =
    await api.functional.todoApp.user.todos.index(userConnection);
  typia.assert(allTodosResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "has valid pagination",
    !!allTodosResponse.pagination,
  );
  TestValidator.predicate(
    "has current page",
    allTodosResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "has valid limit",
    allTodosResponse.pagination.limit >= 0,
  );
  TestValidator.equals(
    "total records match todo count",
    allTodosResponse.pagination.records,
    todoCount,
  );
  TestValidator.predicate(
    "has valid pages count",
    allTodosResponse.pagination.pages >= 0,
  );
  // Test 2: Verify completion status distribution
  const completedTodosManual = allTodosResponse.data.filter(
    (todo) => todo.completion_status === "complete",
  );
  const incompleteTodosManual = allTodosResponse.data.filter(
    (todo) => todo.completion_status === "incomplete",
  );
  TestValidator.equals(
    "completed count matches",
    completedTodosManual.length,
    completedCount,
  );
  TestValidator.equals(
    "incomplete count matches",
    incompleteTodosManual.length,
    todoCount - completedCount,
  );
  // Test 3: Validate individual todo properties
  for (const todo of allTodosResponse.data) {
    typia.assert(todo);
    TestValidator.predicate("has valid id", !!todo.id);
    TestValidator.predicate("has valid title", !!todo.title);
    TestValidator.predicate(
      "has valid completion status",
      todo.completion_status === "complete" ||
        todo.completion_status === "incomplete",
    );
    TestValidator.predicate("has creation timestamp", !!todo.created_at);
    TestValidator.predicate("has user info", !!todo.user);
    TestValidator.predicate("user has valid id", !!todo.user.id);
    TestValidator.predicate("user has valid email", !!todo.user.email);
    TestValidator.predicate(
      "user email format",
      /^[^@]+@[^@]+\.[^@]+$/.test(todo.user.email),
    );
    TestValidator.predicate("user has display name", !!todo.user.display_name);
  }
  // Edge case test: Verify we created multiple todos
  TestValidator.predicate("more than 0 todos created", todoCount > 0);
}
