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
export async function test_api_todo_search_sort_by_due_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a todo user to create and search todos
  const todoUser = await authorize_todo_user_join(connection, {
    body: {
      email: `test-user-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "password123",
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Create a new connection with the authorized user's token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${todoUser.token.access}`,
    },
  };
  // 2. Create todos with various due date configurations
  // Create a todo without a due date
  const todoWithoutDueDate =
    await generate_random_todo_app_todo_user_todos_create(userConnection, {
      body: {
        title: "Todo without due date",
        description: "This todo has no due date",
      },
    });
  // Create todos with different due dates
  const todoWithPastDueDate =
    await generate_random_todo_app_todo_user_todos_create(userConnection, {
      body: {
        title: "Past due todo",
        description: "This todo was due in the past",
        dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      },
    });
  const todoWithFutureDueDate =
    await generate_random_todo_app_todo_user_todos_create(userConnection, {
      body: {
        title: "Future due todo",
        description: "This todo is due in the future",
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString(), // Next week
      },
    });
  const todoWithTodayDueDate =
    await generate_random_todo_app_todo_user_todos_create(userConnection, {
      body: {
        title: "Today due todo",
        description: "This todo is due today",
        dueDate: new Date().toISOString(),
      },
    });
  // Create another todo without a due date to verify multiple nulls are handled correctly
  const anotherTodoWithoutDueDate =
    await generate_random_todo_app_todo_user_todos_create(userConnection, {
      body: {
        title: "Another todo without due date",
        description: "This is another todo with no due date",
      },
    });
  // 3. Search todos with sorting by due date ascending
  // According to requirements, todos without due dates should appear at the end
  const searchResult =
    await api.functional.todoApp.todoUser.todos.search.index(userConnection);
  typia.assert(searchResult);
  // 4. Validate that todos are properly sorted with nulls at the end
  // First verify we have the expected number of todos
  TestValidator.equals(
    "should have 5 todos in total",
    searchResult.data.length,
    5,
  );
  // Check that todos with due dates come first (sorted by due date)
  // Past due date should come first
  TestValidator.equals(
    "first todo should be the past due todo",
    searchResult.data[0]?.title,
    todoWithPastDueDate.title,
  );
  // Today's due date should come second
  TestValidator.equals(
    "second todo should be today's due todo",
    searchResult.data[1]?.title,
    todoWithTodayDueDate.title,
  );
  // Future due date should come third
  TestValidator.equals(
    "third todo should be the future due todo",
    searchResult.data[2]?.title,
    todoWithFutureDueDate.title,
  );
  // Todos without due dates should be at the end
  // We can't guarantee the order between the two null todos, so we just check that
  // the last two todos have null due dates
  TestValidator.equals(
    "fourth todo should have no due date",
    searchResult.data[3]?.dueDate,
    null,
  );
  TestValidator.equals(
    "fifth todo should have no due date",
    searchResult.data[4]?.dueDate,
    null,
  );
  // Also verify that the todos without due dates are the ones we created
  const nullDueDateTitles = [
    todoWithoutDueDate.title,
    anotherTodoWithoutDueDate.title,
  ];
  TestValidator.predicate(
    "fourth todo should be one of our null due date todos",
    () => nullDueDateTitles.includes(searchResult.data[3]?.title ?? ""),
  );
  TestValidator.predicate(
    "fifth todo should be the other null due date todo",
    () =>
      nullDueDateTitles.includes(searchResult.data[4]?.title ?? "") &&
      searchResult.data[4]?.title !== searchResult.data[3]?.title,
  );
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should show 5 records",
    searchResult.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination should show 1 page",
    searchResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination limit should be set",
    searchResult.pagination.limit > 0,
    true,
  );
}
