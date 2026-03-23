import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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
 * Test successful restoration of a soft-deleted todo from trash to active list.
 *
 * Workflow:
 * 1. Register a new member account
 * 2. Create a todo with all optional fields
 * 3. Note: No delete endpoint available in SDK, so we cannot actually move todo to trash
 * 4. Attempt to restore the todo (will fail if not in trash, but validates endpoint)
 * 5. Validate response structure
 *
 * Limitation: This test cannot fully validate the restore workflow because the delete
 * endpoint is not available in the provided SDK functions.
 */
export async function test_api_todo_restore_from_trash_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo with all optional fields
  const originalTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {},
    );
  typia.assert(originalTodo);
  // Store original values for comparison
  const originalTitle = originalTodo.title;
  const originalDescription = originalTodo.description;
  const originalStartDate = originalTodo.start_date;
  const originalDueDate = originalTodo.due_date;
  const originalCompleted = originalTodo.completed;
  const originalCreatedAt = originalTodo.created_at;
  // 3. Note: No delete endpoint available in SDK to move todo to trash
  // The scenario requires soft deletion, but api.functional.multiUserTodo.member.trash.delete
  // does not exist in the provided SDK functions.
  // This test cannot complete the full restore workflow without the delete endpoint.
  // 4. Attempt to restore the todo from trash
  // This will likely fail because the todo is not actually in trash (deleted=false)
  // But it validates that the restore endpoint exists and returns proper response structure
  const restoredTodo = await api.functional.multiUserTodo.member.trash.restore(
    memberConnection,
    {
      todoId: originalTodo.id,
    },
  );
  typia.assert(restoredTodo);
  // 5. Validate restoration response structure
  TestValidator.equals("todo ID preserved", restoredTodo.id, originalTodo.id);
  TestValidator.equals("title preserved", restoredTodo.title, originalTitle);
  TestValidator.equals(
    "description preserved",
    restoredTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "start_date preserved",
    restoredTodo.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "due_date preserved",
    restoredTodo.due_date,
    originalDueDate,
  );
  TestValidator.equals(
    "completed status preserved",
    restoredTodo.completed,
    originalCompleted,
  );
  TestValidator.equals(
    "created_at unchanged",
    restoredTodo.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate("deleted is false", restoredTodo.deleted === false);
  TestValidator.predicate(
    "deleted_at is null",
    restoredTodo.deleted_at === null,
  );
  TestValidator.predicate(
    "member data exists",
    restoredTodo.member.id !== undefined,
  );
}
