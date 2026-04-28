import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistory";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Verify todo edit history pagination and ordering.
 *
 * Tests that a todo edited multiple times results in a paginated edit history sorted from most recent to oldest. Validates pagination metadata accurately reflects the total records and pages. Confirms that each history entry only contains values for fields that changed during that specific edit, with unchanged fields appearing as null. Ensures chronological ordering by created_at DESC.
 *
 * 1. Join as a new member and authenticate.
 * 2. Create a new todo.
 * 3. Edit the todo three times: update title, then description, then due date.
 * 4. Fetch the edit history with pagination parameters.
 * 5. Validate pagination metadata matches expectations.
 * 6. Validate ordering of history entries.
 * 7. Validate that each entry reflects only the changes made in that edit.
 */
export async function test_api_todo_edit_history_pagination_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit the todo multiple times to generate history
  // Edit 1: Update title
  await api.functional.todoApp.member.todos.update(memberConnection, {
    todoId: todo.id,
    body: {
      title: RandomGenerator.name(),
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Edit 2: Update description
  await api.functional.todoApp.member.todos.update(memberConnection, {
    todoId: todo.id,
    body: {
      title: todo.title,
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Edit 3: Update due_date
  await api.functional.todoApp.member.todos.update(memberConnection, {
    todoId: todo.id,
    body: {
      title: todo.title,
      due_date: new Date().toISOString(),
    } satisfies ITodoAppTodo.IUpdate,
  });
  // 4. Fetch edit history with pagination
  const page = 1;
  const limit = 2; // Limit to 2 to test pagination
  const historyPage =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page,
          limit,
        } satisfies ITodoAppEditHistory.IRequest,
      },
    );
  typia.assert(historyPage);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    historyPage.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", historyPage.pagination.limit, limit);
  TestValidator.equals("total records", historyPage.pagination.records, 3); // 3 edits
  TestValidator.equals("total pages", historyPage.pagination.pages, 2); // ceil(3/2) = 2
  // 6. Validate ordering (most recent first)
  TestValidator.predicate(
    "history should be ordered by created_at DESC",
    () => {
      if (historyPage.data.length > 1) {
        return historyPage.data[0].created_at >= historyPage.data[1].created_at;
      }
      return true;
    },
  );
  // 7. Validate first page data (2 items)
  TestValidator.equals(
    "first page should have 2 items",
    historyPage.data.length,
    2,
  );
  // Validate Edit 3 (due_date change) - Should be first (most recent)
  const latestEdit = historyPage.data[0];
  TestValidator.equals("latest edit title is null", latestEdit.title, null);
  TestValidator.equals(
    "latest edit description is null",
    latestEdit.description,
    null,
  );
  TestValidator.predicate(
    "latest edit due_date is not null",
    latestEdit.due_date !== null,
  );
  TestValidator.equals(
    "latest edit start_date is null",
    latestEdit.start_date,
    null,
  );
  // Validate Edit 2 (description change) - Should be second
  const secondEdit = historyPage.data[1];
  TestValidator.equals("second edit title is null", secondEdit.title, null);
  TestValidator.predicate(
    "second edit description is not null",
    secondEdit.description !== null,
  );
  TestValidator.equals(
    "second edit due_date is null",
    secondEdit.due_date,
    null,
  );
  TestValidator.equals(
    "second edit start_date is null",
    secondEdit.start_date,
    null,
  );
  // Fetch second page to validate pagination boundary
  const historyPage2 =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies ITodoAppEditHistory.IRequest,
      },
    );
  typia.assert(historyPage2);
  TestValidator.equals(
    "second page current",
    historyPage2.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", historyPage2.pagination.limit, 2);
  TestValidator.equals(
    "second page total records",
    historyPage2.pagination.records,
    3,
  );
  TestValidator.equals(
    "second page total pages",
    historyPage2.pagination.pages,
    2,
  );
  TestValidator.equals(
    "second page should have 1 item",
    historyPage2.data.length,
    1,
  );
  // Validate Edit 1 (title change) - Should be on second page (oldest)
  const oldestEdit = historyPage2.data[0];
  TestValidator.predicate(
    "oldest edit title is not null",
    oldestEdit.title !== null,
  );
  TestValidator.equals(
    "oldest edit description is null",
    oldestEdit.description,
    null,
  );
  TestValidator.equals(
    "oldest edit due_date is null",
    oldestEdit.due_date,
    null,
  );
  TestValidator.equals(
    "oldest edit start_date is null",
    oldestEdit.start_date,
    null,
  );
}
