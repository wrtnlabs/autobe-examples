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
 * Test that restoring a todo not in trash returns 400 Bad Request error.
 *
 * Scenario:
 * 1. Authenticate as a member
 * 2. Create an active todo (not in trash)
 * 3. Attempt to restore the active todo - should fail with 400 error
 * 4. Verify error indicates todo is not in trash
 */
export async function test_api_trash_restore_not_in_trash_error(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an active todo (not in trash)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // Verify the todo is active (not in trash)
  TestValidator.equals(
    "active todo should not be in trash",
    todo.deletedAt,
    null,
  );
  // Step 3 & 4: Attempt to restore a todo that is NOT in trash - should fail
  await TestValidator.httpError(
    "restoring non-deleted todo should fail",
    400,
    async () => {
      await api.functional.todoApp.member.trash.restore(memberConnection, {
        todoId: todo.id,
      });
    },
  );
}
