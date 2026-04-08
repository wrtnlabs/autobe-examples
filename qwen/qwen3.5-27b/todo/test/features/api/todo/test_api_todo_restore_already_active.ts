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
 * Test error handling when attempting to restore a todo that is already active.
 *
 * Validates that the restore operation correctly rejects todos that are not in trash state. After authentication and creating an active todo, the test attempts to call the restore endpoint on this active todo. The system should return a 409 Conflict error since the todo is not in trash state.
 *
 * This test ensures proper state validation in the todo lifecycle, preventing invalid state transitions from active to restored (which is a no-op).
 *
 * 1. Authenticate as member using authorize_member_join utility
 * 2. Create an active todo using generate_random_todo_app_member_todos_create utility
 * 3. Attempt to restore the active todo (not in trash)
 * 4. Validate that operation fails with 409 Conflict error
 */
export async function test_api_todo_restore_already_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an active todo (not in trash)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Attempt to restore the active todo (should fail with 409 Conflict)
  await TestValidator.httpError(
    "restore active todo returns 409 Conflict",
    409,
    async () =>
      await api.functional.todoApp.member.trash.restore(memberConnection, {
        todoId: todo.id,
      }),
  );
}
