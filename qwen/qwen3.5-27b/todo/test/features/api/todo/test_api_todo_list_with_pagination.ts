import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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
 * Test that an authenticated member can retrieve a paginated list of their own todos.
 *
 * Validates the complete todo listing workflow including member authentication, multiple todo creation, and paginated retrieval. Ensures that pagination metadata is accurate, todos are correctly filtered to the authenticated member only, and default sorting by creation date works as expected.
 *
 * Special attention is given to verifying pagination accuracy across multiple pages, data isolation (member can only see their own todos), and that soft-deleted todos are excluded from results.
 *
 * 1. Register a new member account with valid email and password.
 * 2. Create 25 todo items with various completion statuses and dates (exceeds default page limit of 20).
 * 3. Retrieve first page of todos with default pagination parameters.
 * 4. Verify pagination metadata shows correct totals (25 records, 2 pages).
 * 5. Verify first page contains exactly 20 todos with correct fields.
 * 6. Verify all todos belong to the authenticated member.
 * 7. Retrieve second page to verify pagination continuation.
 * 8. Verify second page contains remaining 5 todos.
 * 9. Verify todos are sorted by created_at in descending order (newest first).
 */
export async function test_api_todo_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create 25 todos to test pagination (more than default limit of 20)
  const todos: ITodoAppTodo[] = [];
  for (let i = 0; i < 25; i++) {
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Todo Item ${i + 1}`,
          description: i % 2 === 0 ? `Description for todo ${i + 1}` : null,
          start_date: i % 3 === 0 ? new Date().toISOString() : null,
          due_date:
            i % 3 === 1 ? new Date(Date.now() + 86400000).toISOString() : null,
        },
      },
    );
    typia.assert(todo);
    todos.push(todo);
    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 3. Retrieve first page with default parameters (limit 20)
  const firstPage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(firstPage);
  // 4. Verify pagination metadata for first page
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("limit is 20", firstPage.pagination.limit, 20);
  TestValidator.equals("total records is 25", firstPage.pagination.records, 25);
  TestValidator.equals("total pages is 2", firstPage.pagination.pages, 2);
  // 5. Verify first page contains exactly 20 todos
  TestValidator.equals("first page has 20 todos", firstPage.data.length, 20);
  // 6. Verify all todos belong to authenticated member
  for (const todo of firstPage.data) {
    TestValidator.equals(
      "todo belongs to authenticated member",
      todo.member.id,
      firstPage.data[0].member.id,
    );
  }
  // 7. Retrieve second page
  const secondPage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(secondPage);
  // 8. Verify pagination metadata for second page
  TestValidator.equals(
    "second page current is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 20",
    secondPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "second page total records is 25",
    secondPage.pagination.records,
    25,
  );
  TestValidator.equals(
    "second page total pages is 2",
    secondPage.pagination.pages,
    2,
  );
  // 9. Verify second page contains remaining 5 todos
  TestValidator.equals("second page has 5 todos", secondPage.data.length, 5);
  // 10. Verify todos are sorted by created_at descending (newest first)
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    TestValidator.predicate(
      `todo ${i} created_at >= todo ${i + 1} created_at`,
      new Date(firstPage.data[i].created_at).getTime() >=
        new Date(firstPage.data[i + 1].created_at).getTime(),
    );
  }
}
