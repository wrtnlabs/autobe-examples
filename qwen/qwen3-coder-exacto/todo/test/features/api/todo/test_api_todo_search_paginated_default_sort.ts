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
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_todo_user_todos_create } from "../../../generate/generate_random_todo_app_todo_user_todos_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_search_paginated_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new todo user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_todo_user_join(userConnection, {
    body: {
      email: `test-${Date.now()}@example.com`,
      password: "password123",
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Update connection with authorization token
  userConnection.headers = {
    Authorization: `Bearer ${user.token.access}`,
  };
  // Step 2: Create multiple todos for the user
  const todoCount = 5;
  const todos = [];
  for (let i = 0; i < todoCount; i++) {
    const todo = await generate_random_todo_app_todo_user_todos_create(
      userConnection,
      {
        body: {
          title: `Test Todo ${i + 1}`,
          description: `Description for test todo ${i + 1}`,
          startDate: new Date(Date.now() + i * 86400000).toISOString(), // Different dates for each todo
          dueDate: new Date(Date.now() + (i + 7) * 86400000).toISOString(),
        },
      },
    );
    todos.push(todo);
  }
  // Step 3: Perform paginated search with default sorting
  const response =
    await api.functional.todoApp.todoUser.todos.search.index(userConnection);
  typia.assert(response);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match default",
    response.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records count should match created todos",
    response.pagination.records,
    todoCount,
  );
  TestValidator.equals(
    "pagination pages should be 1 when todos fit on one page",
    response.pagination.pages,
    1,
  );
  // Step 5: Validate that data array contains the expected number of todos
  TestValidator.equals(
    "response data should contain all created todos",
    response.data.length,
    todoCount,
  );
  // Step 6: Validate default sorting (creation date, newest first)
  // The todos should be sorted by createdAt in descending order (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentTodo = new Date(response.data[i].createdAt).getTime();
    const nextTodo = new Date(response.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `todo at index ${i} should be created more recently than todo at index ${i + 1}`,
      () => currentTodo >= nextTodo,
    );
  }
  // Step 7: Validate that each todo has the expected structure
  response.data.forEach((todo, index) => {
    TestValidator.equals(
      `todo ${index} should have an ID`,
      typeof todo.id,
      "string",
    );
    TestValidator.equals(
      `todo ${index} should have a title`,
      typeof todo.title,
      "string",
    );
    TestValidator.equals(
      `todo ${index} should have a completed status`,
      typeof todo.completed,
      "boolean",
    );
    TestValidator.equals(
      `todo ${index} should have a creation date`,
      typeof todo.createdAt,
      "string",
    );
    // startDate and dueDate can be null, so we check they are either string or null
    if (todo.startDate !== null) {
      TestValidator.equals(
        `todo ${index} startDate should be string if present`,
        typeof todo.startDate,
        "string",
      );
    }
    if (todo.dueDate !== null) {
      TestValidator.equals(
        `todo ${index} dueDate should be string if present`,
        typeof todo.dueDate,
        "string",
      );
    }
  });
}
