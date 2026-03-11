import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistorySnapshot";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistorySnapshot";
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

/**
 * Test retrieval of edit history snapshots for a newly created todo that has no edit history yet.
 * 1. Authenticate as member via join endpoint
 * 2. Create a fresh todo without making any edits
 * 3. Call edit history snapshots endpoint with default pagination
 * 4. Validate empty data array with correct pagination metadata (records: 0, pages: 0)
 * 5. Test with date filters to ensure no errors when no snapshots exist
 */
export async function test_api_edit_history_snapshot_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IMultiUserTodoMember.IJoin>,
  });
  typia.assert(member);
  // 2. Create a fresh todo without any edits
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies DeepPartial<IMultiUserTodoTodo.ICreate>,
    },
  );
  typia.assert(todo);
  // 3. Call edit history snapshots endpoint with default pagination
  const emptyResponse =
    await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // 4. Validate empty data array with correct pagination metadata
  TestValidator.equals(
    "data array should be empty for new todo",
    emptyResponse.data,
    [],
  );
  TestValidator.equals(
    "records should be 0 for new todo",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 when records is 0",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be default (1)",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be default",
    emptyResponse.pagination.limit,
    30,
  );
  // 5. Test with date filters to ensure no errors when no snapshots exist
  const now = new Date().toISOString();
  const filteredResponse =
    await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_after: now,
          created_before: now,
          updated_after: now,
          updated_before: now,
        } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.equals(
    "data array should be empty with date filters",
    filteredResponse.data,
    [],
  );
  TestValidator.equals(
    "records should be 0 with date filters",
    filteredResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 with date filters",
    filteredResponse.pagination.pages,
    0,
  );
}
