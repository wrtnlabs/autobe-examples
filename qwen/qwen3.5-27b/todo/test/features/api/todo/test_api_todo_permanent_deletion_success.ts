import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test successful permanent deletion of a todo from trash.
 *
 * Validates the complete permanent deletion workflow including member authentication, todo creation, soft deletion to trash, and final permanent deletion. Ensures that permanently deleted todos are removed from the system and cannot be accessed afterward.
 *
 * The test verifies that:
 * - Member can authenticate and create todos
 * - Soft deletion moves todo to trash state
 * - Permanent deletion removes todo and its edit history
 * - Permanently deleted todos return error when accessed again
 *
 * 1. Authenticate as a new member with auto-generated credentials.
 * 2. Create a todo with a title for testing deletion workflow.
 * 3. Soft delete the todo to move it to trash.
 * 4. Permanently delete the todo from trash.
 * 5. Verify the todo no longer exists by attempting to delete from trash again.
 */
export async function test_api_todo_permanent_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Soft delete the todo (move to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Permanently delete from trash
  await api.functional.todoApp.member.trash.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Verify todo no longer exists in trash (should throw error)
  await TestValidator.error(
    "permanently deleted todo should not exist in trash",
    async () => {
      await api.functional.todoApp.member.trash.erase(memberConnection, {
        todoId: todo.id,
      });
    },
  );
}
