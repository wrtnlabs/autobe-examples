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
 * Verify that the active todo list with default parameters returns only non-trashed todos sorted by creation date newest first with correct pagination metadata.
 *
 * Tests the default browsing behavior of the active todo list endpoint. When no search, filter, sort, or pagination parameters are provided, the endpoint must return only non-trashed (active) todos belonging to the authenticated member, sorted by creation date in descending order (newest first), with default pagination of page 1 and limit 20.
 *
 * The soft-delete boundary is verified by creating an additional todo, moving it to the trash, and confirming it does not appear in the active list. Pagination metadata correctness ensures the client can properly render navigation controls.
 *
 * 1. Member joins and authenticates.
 * 2. Two active todos "Alpha" and "Beta" are created in sequence.
 * 3. A third todo "Gamma" is created and soft-deleted, moving it to trash.
 * 4. The active list is fetched with an empty body (all defaults).
 * 5. Validates that only active todos appear, in newest-first order, with accurate pagination metadata.
 */
export async function test_api_todo_list_default_browsing_excludes_trashed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create first active todo "Alpha"
  const alpha = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { title: "Alpha" } },
  );
  typia.assert(alpha);
  // 3. Create second active todo "Beta"
  const beta = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { title: "Beta" } },
  );
  typia.assert(beta);
  // 4. Create third todo "Gamma" and soft-delete it
  const gamma = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { title: "Gamma" } },
  );
  typia.assert(gamma);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: gamma.id,
  });
  // 5. Browse active todo list with all defaults (empty body)
  const page = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page);
  // 6. Validate: exactly 2 active todos, newest first
  TestValidator.equals("active todo count", page.data.length, 2);
  TestValidator.equals(
    "first todo is Beta (newest)",
    page.data[0].title,
    "Beta",
  );
  TestValidator.equals(
    "second todo is Alpha (oldest)",
    page.data[1].title,
    "Alpha",
  );
  // 7. Validate: soft-deleted Gamma is excluded from active list
  TestValidator.predicate(
    "Gamma is excluded from active list",
    !page.data.some((todo) => todo.id === gamma.id),
  );
  // 8. Validate pagination metadata
  TestValidator.equals(
    "current page",
    page.pagination.current,
    1 satisfies number as number,
  );
  TestValidator.equals(
    "page limit",
    page.pagination.limit,
    20 satisfies number as number,
  );
  TestValidator.equals(
    "total records",
    page.pagination.records,
    2 satisfies number as number,
  );
  TestValidator.equals(
    "total pages",
    page.pagination.pages,
    1 satisfies number as number,
  );
}
