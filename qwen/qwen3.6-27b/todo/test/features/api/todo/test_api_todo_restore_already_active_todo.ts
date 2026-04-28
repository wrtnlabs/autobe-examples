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
 * Test that restoring an already active todo is rejected with 409 Conflict.
 *
 * Validates that attempting to restore a todo that is not in trash state (i.e., a todo with deleted_at being null) is rejected by the system. After a member creates an active todo, directly calling the restore endpoint without soft-deleting the todo first should result in a 409 Conflict error, indicating the todo cannot be restored because it is already active. The system must reject this invalid state transition to prevent unintended side effects.
 *
 * 1. Member registers and authenticates.
 * 2. Member creates a todo that remains in active state (deleted_at is null).
 * 3. Member attempts to restore the active todo without soft-deleting it.
 * 4. Validates 409 Conflict error is thrown.
 * 5. Validates the todo was in active state with deleted_at remaining null.
 */
export async function test_api_todo_restore_already_active_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: undefined });
  // 2. Create an active todo (deleted_at is null by default)
  const todo =
    await generate_random_todo_app_member_todos_create(memberConnection);
  typia.assert(todo);
  // 3. Validate todo is in active state (deleted_at is null)
  TestValidator.equals(
    "todo is active with deleted_at null",
    todo.deleted_at,
    null,
  );
  // 4. Attempt to restore the already active todo - should throw 409 Conflict
  await TestValidator.httpError(
    "restoring active todo returns 409 Conflict",
    409,
    async () =>
      await api.functional.todoApp.member.todos.restore(memberConnection, {
        todoId: todo.id,
      }),
  );
}
