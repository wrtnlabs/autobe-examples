import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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
 * Test edit history listing for an owned todo is paginated and ordered.
 *
 * Validates that an authenticated member can access the edit-history list for one of their own todos, and that the response follows the required pagination and reverse-chronological ordering rules.
 *
 * The test also verifies the ownership boundary by confirming every returned history entry points to the requested todo. When edit-history records are available, it ensures the list is sorted from newest to oldest by editedAt and that the response shape remains stable for browser-style consumption.
 *
 * 1. Register and authenticate a private member account.
 * 2. Create one todo owned by that member.
 * 3. Request the todo's edit-history page.
 * 4. Validate pagination metadata, ownership, and ordering.
 */
export async function test_api_todo_edit_history_list_own_todo_ordered(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234abcd!",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: new Date(Date.now() + 1000).toISOString(),
        dueDate: new Date(Date.now() + 2000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  const output = await api.functional.todoApp.member.todos.editHistories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoEditHistory.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination record count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all entries belong to the requested todo",
    output.data.every((item) => item.todo.id === todo.id),
  );
  TestValidator.predicate(
    "history is ordered newest to oldest",
    output.data.every(
      (item, index, array) =>
        index === 0 || array[index - 1].editedAt >= item.editedAt,
    ),
  );
  TestValidator.predicate(
    "history entries have valid snapshots when present",
    output.data.every(
      (item) =>
        item.title !== null ||
        item.description !== null ||
        item.startDate !== null ||
        item.dueDate !== null ||
        item.createdAt.length > 0,
    ),
  );
}
