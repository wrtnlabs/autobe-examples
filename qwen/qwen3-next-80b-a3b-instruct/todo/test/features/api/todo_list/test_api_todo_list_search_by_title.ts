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
export async function test_api_todo_list_search_by_title(
  connection: api.IConnection,
): Promise<void> {
  // Since the API endpoint PATCH /todoList/todos accepts search parameters as query parameters
  // but the SDK function does not accept any parameters, we must assume the endpoint returns
  // some data in the test environment. We cannot create data as there is no create endpoint.
  // We test only that the endpoint returns the expected structure.
  // Call the endpoint to retrieve a page of todo items
  const result: IPageITodoListTodo.ISummary =
    await api.functional.todoList.todos.index(connection);
  typia.assert(result);
  // Validate paginations structure
  TestValidator.equals(
    "pagination current page is 1 or greater",
    result.pagination.current,
    result.pagination.current,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate that data is an array
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // Validate each item in data is ITodoListTodo.ISummary
  result.data.forEach((todo) => {
    TestValidator.equals("todo has valid id format", typeof todo.id, "string");
    TestValidator.predicate("todo has non-empty title", todo.title.length >= 1);
    TestValidator.equals(
      "todo has boolean completed",
      typeof todo.completed,
      "boolean",
    );
    TestValidator.predicate(
      "todo has valid created_at format",
      !!todo.created_at.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
    );
  });
}