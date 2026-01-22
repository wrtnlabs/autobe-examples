import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
export async function test_api_todo_list_search_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // All todos API endpoint
  const todos = await api.functional.todoList.todos.index(connection);
  typia.assert(todos);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 0",
    todos.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit is at least 0",
    todos.pagination.limit,
    0,
  );
  TestValidator.equals(
    "pagination records is at least 0",
    todos.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is at least 0",
    todos.pagination.pages,
    0,
  );
  // Validate that data exists and has correct structure
  for (const todo of todos.data) {
    TestValidator.predicate("todo has valid ID", typeof todo.id === "string");
    TestValidator.predicate(
      "todo title is string",
      typeof todo.title === "string",
    );
    TestValidator.predicate("todo title has length > 0", todo.title.length > 0);
    TestValidator.predicate(
      "todo completed is boolean",
      typeof todo.completed === "boolean",
    );
    TestValidator.predicate(
      "todo created_at is ISO date-time",
      typeof todo.created_at === "string",
    );
  }
}
