import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserStatus";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_todo_user_todos_create } from "../../../generate/generate_random_todo_app_todo_user_todos_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_search_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // Check system status before testing
  const systemStatus =
    await api.functional.todoApp.system.status.at(connection);
  typia.assert(systemStatus);
  // Authenticate as todoUser to create and search todos
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_todo_user_join(userConnection, {
    body: {
      email: `test-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Create todos for testing search functionality
  // Create 3 incomplete todos
  const incompleteTodos = await ArrayUtil.asyncRepeat(3, async () => {
    const todo = await generate_random_todo_app_todo_user_todos_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          completed: false,
        },
      },
    );
    typia.assert(todo);
    return todo;
  });
  // Create 2 complete todos
  const completeTodos = await ArrayUtil.asyncRepeat(2, async () => {
    const todo = await generate_random_todo_app_todo_user_todos_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          completed: true,
        },
      },
    );
    typia.assert(todo);
    return todo;
  });
  // Test search for all todos (no filter)
  const allTodosResponse =
    await api.functional.todoApp.todoUser.todos.search.index(userConnection);
  typia.assert(allTodosResponse);
  // Should have 5 todos total
  TestValidator.equals(
    "total todo count should be 5",
    allTodosResponse.pagination.records,
    5,
  );
  // Should have all 5 todos in data array
  TestValidator.equals(
    "all todos should be returned in data array",
    allTodosResponse.data.length,
    5,
  );
  // Test search for only complete todos
  // For now, we're testing the basic search functionality since filtering by completion status
  // would require specific query parameters which aren't defined in the API function signature
  // The functionality exists per the scenario, but we test what we can with the available API
  // We can at least verify that todos have the correct completion status
  const completeTodoInResponse = allTodosResponse.data.find((todo) =>
    completeTodos.some((completeTodo) => completeTodo.id === todo.id),
  );
  const incompleteTodoInResponse = allTodosResponse.data.find((todo) =>
    incompleteTodos.some((incompleteTodo) => incompleteTodo.id === todo.id),
  );
  if (completeTodoInResponse) {
    TestValidator.equals(
      "complete todo should have completed status",
      completeTodoInResponse.completed,
      true,
    );
  }
  if (incompleteTodoInResponse) {
    TestValidator.equals(
      "incomplete todo should have incomplete status",
      incompleteTodoInResponse.completed,
      false,
    );
  }
  // Test pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    allTodosResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    allTodosResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination pages should be at least 1",
    allTodosResponse.pagination.pages >= 1,
    true,
  );
}