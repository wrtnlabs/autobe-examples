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
 * Test viewing paginated trash list after soft-deleting todos.
 *
 * Validates that soft-deleted todos appear in the trash list with correct pagination metadata, summary fields, and default sorting order. Ensures that only trashed todos are included and that the default pagination parameters (page 1, limit 20, sort by created_at descending) produce expected results.
 *
 * Also verifies that todos with no completion toggles have null completed_at in the summary view, confirming the business rule that newly created todos default to incomplete.
 *
 * 1. Register and authenticate as a new member.
 * 2. Create three todos with distinct titles.
 * 3. Soft-delete all three todos to move them to trash.
 * 4. Request the trash list with default pagination (empty body).
 * 5. Verify the response contains exactly 3 records.
 * 6. Verify pagination metadata: current=1, records=3, pages=1.
 * 7. Verify todos are ordered newest first by created_at.
 * 8. Verify completed_at is null for all (never toggled complete).
 */
export async function test_api_trash_list_view_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create three todos with distinct titles
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { title: "First todo for trash test" } },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { title: "Second todo for trash test" } },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { title: "Third todo for trash test" } },
  );
  typia.assert(todo3);
  // 3. Soft-delete all three todos
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo3.id,
  });
  // 4. Request trash list with default pagination
  const page = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    { body: {} satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(page);
  // 5. Verify record count
  TestValidator.equals("record count", page.data.length, 3);
  // 6. Verify pagination metadata
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("total records", page.pagination.records, 3);
  TestValidator.equals("total pages", page.pagination.pages, 1);
  // 7. Verify todos are ordered newest first by created_at (descending)
  TestValidator.predicate(
    "newest first order",
    page.data[0].created_at >= page.data[1].created_at &&
      page.data[1].created_at >= page.data[2].created_at,
  );
  // 8. Verify completed_at is null for all (never toggled complete)
  for (const summary of page.data) {
    TestValidator.equals("completed_at is null", summary.completed_at, null);
  }
}
