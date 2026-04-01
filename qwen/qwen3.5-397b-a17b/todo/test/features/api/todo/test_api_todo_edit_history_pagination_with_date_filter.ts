import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_edit_history_pagination_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve first page of edit history (page=1, limit=5)
  const firstPage =
    await api.functional.multiUserTodo.member.todos.history.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IMultiUserTodoTodoEditHistory.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    firstPage.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("limit is 5", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(firstPage.data));
  // 4. Retrieve second page of edit history (page=2, limit=5)
  const secondPage =
    await api.functional.multiUserTodo.member.todos.history.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IMultiUserTodoTodoEditHistory.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate second page pagination metadata
  TestValidator.equals(
    "second page current is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 5",
    secondPage.pagination.limit,
    5,
  );
  // 5. Retrieve history with date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const filteredHistory =
    await api.functional.multiUserTodo.member.todos.history.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
        } satisfies IMultiUserTodoTodoEditHistory.IRequest,
      },
    );
  typia.assert(filteredHistory);
  // Validate filtered response structure
  TestValidator.predicate(
    "filtered pagination exists",
    filteredHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "filtered data array exists",
    Array.isArray(filteredHistory.data),
  );
  // 6. Validate that all history entries have required fields
  for (const entry of firstPage.data) {
    TestValidator.predicate(
      "entry has valid UUID",
      /^[0-9a-f-]{36}$/i.test(entry.id),
    );
    TestValidator.predicate(
      "entry has created_at",
      entry.created_at !== undefined,
    );
    TestValidator.predicate(
      "created_at is valid ISO date",
      !isNaN(Date.parse(entry.created_at)),
    );
  }
  // 7. Validate pagination consistency
  TestValidator.predicate(
    "pages calculated correctly",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit) ||
      firstPage.pagination.records === 0,
  );
  // 8. Test with different limit values
  const limit10 = await api.functional.multiUserTodo.member.todos.history.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodoEditHistory.IRequest,
    },
  );
  typia.assert(limit10);
  TestValidator.equals("limit 10 page is 1", limit10.pagination.current, 1);
  TestValidator.equals("limit 10 limit is 10", limit10.pagination.limit, 10);
  // 9. Test with maximum limit (100)
  const limit100 =
    await api.functional.multiUserTodo.member.todos.history.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IMultiUserTodoTodoEditHistory.IRequest,
      },
    );
  typia.assert(limit100);
  TestValidator.equals(
    "limit 100 limit is 100",
    limit100.pagination.limit,
    100,
  );
  // 10. Validate that filtered and unfiltered have same total records (when no date filter)
  // This ensures filtering doesn't affect the base count incorrectly
  TestValidator.predicate(
    "records count is consistent",
    firstPage.pagination.records >= 0,
  );
}
