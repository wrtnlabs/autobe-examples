import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoItem";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_items_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. User registration for authentication
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoUser.ICreate;
  const authorizedUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Retrieve todo items with filter, pagination, and sorting
  // Using realistic request values as per DTO IRequest
  const todoItemsSearchRequest = {
    description: RandomGenerator.substring(
      "Test content for todo item description to search.",
    ),
    page: 1,
    page_size: 10,
    sort_by: "created_at",
    sort_order: "desc",
    status: RandomGenerator.pick(["pending", "completed"] as const),
    due_date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    due_date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoItem.IRequest;

  const todoItemsPage: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: todoItemsSearchRequest,
    });
  typia.assert(todoItemsPage);

  // 3. Validate response data pagination
  TestValidator.predicate(
    "pagination current page should be 1",
    todoItemsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match page_size",
    todoItemsPage.pagination.limit === todoItemsSearchRequest.page_size,
  );

  // 4. Validate each todo item in the list
  for (const item of todoItemsPage.data) {
    typia.assert(item);

    TestValidator.predicate(
      "todo item description filter",
      todoItemsSearchRequest.description === undefined ||
        item.description.includes(todoItemsSearchRequest.description),
    );
    TestValidator.equals(
      "todo item status matches filter",
      item.status,
      todoItemsSearchRequest.status ?? item.status,
    );

    const dueDate = item.due_date;
    if (dueDate !== null && dueDate !== undefined) {
      const dueDateTime = new Date(dueDate).getTime();
      const fromTime = todoItemsSearchRequest.due_date_from
        ? new Date(todoItemsSearchRequest.due_date_from).getTime()
        : undefined;
      const toTime = todoItemsSearchRequest.due_date_to
        ? new Date(todoItemsSearchRequest.due_date_to).getTime()
        : undefined;
      if (fromTime !== undefined)
        TestValidator.predicate(
          "todo item due_date not before from",
          dueDateTime >= fromTime,
        );
      if (toTime !== undefined)
        TestValidator.predicate(
          "todo item due_date not after to",
          dueDateTime <= toTime,
        );
    }
  }
}
