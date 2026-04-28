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
 * Test viewing soft-deleted todos in the trash with pagination.
 *
 * Validates the complete trash viewing workflow including member registration, multiple todo creation with varying titles, selective soft-deletion via the erase endpoint, and paginated trash list retrieval. Ensures that the trash list correctly contains only the soft-deleted todos and excludes any todos that remain in the active state.
 *
 * Special attention is given to verifying pagination metadata accuracy, confirming that trashed item IDs match only the deleted todos, and ensuring that active todos never appear in the trash response.
 *
 * 1. Member registers and authenticates via the join utility.
 * 2. Member creates three todos with distinct titles.
 * 3. Two of the three todos are soft-deleted using the erase endpoint.
 * 4. The trash list is retrieved with pagination parameters (page 1, limit 10).
 * 5. Validates that pagination records count matches the number of soft-deleted todos.
 * 6. Validates that trash data contains only the soft-deleted todo IDs.
 * 7. Validates that the active todo ID does not appear in the trash list.
 */
export async function test_api_todo_trash_view_soft_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registers and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create three todos with distinct titles
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: { title: "First todo task" },
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: { title: "Second todo task" },
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: { title: "Third todo task" },
    },
  );
  typia.assert(todo3);
  // 3. Soft-delete first and third todos (keep second active)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo3.id,
  });
  const trashedTodoIds = [todo1.id, todo3.id];
  const activeTodoIds = [todo2.id];
  // 4. Retrieve the trash list with pagination
  const trashBody = { page: 1, limit: 10 } satisfies ITodoAppTodo.ITrashRequest;
  const trashList: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: trashBody,
    });
  typia.assert(trashList);
  // 5. Validate pagination metadata
  TestValidator.equals("trash record count", trashList.pagination.records, 2);
  TestValidator.equals("trash data length", trashList.data.length, 2);
  // 6. Validate trash contains only soft-deleted todos
  const trashItemIds = trashList.data.map((item) => item.id);
  for (const trashedId of trashedTodoIds) {
    TestValidator.predicate(
      `${trashedId} is in trash list`,
      trashItemIds.includes(trashedId),
    );
  }
  // 7. Validate active todos are excluded from trash
  for (const activeId of activeTodoIds) {
    TestValidator.predicate(
      `${activeId} is NOT in trash list`,
      !trashItemIds.includes(activeId),
    );
  }
}
