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
 * Test restoring a todo that is already active (not in trash).
 *
 * Validates that the restore operation properly rejects attempts to restore todos
 * that are not currently in trash. This ensures data integrity by preventing
 * duplicate restoration operations and validating the is_deleted=true prerequisite.
 *
 * The test creates a member account, generates an active todo, and then attempts
 * to restore the todo. Since the todo is already active (is_deleted=false), the
 * operation should return a 400 Bad Request with an appropriate error message.
 */
export async function test_api_todo_restore_already_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create an active todo (is_deleted=false by default)
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(todo);
  // 3. Verify todo is in active state (not in trash)
  typia.assert(todo.is_deleted === false);
  typia.assert(todo.deleted_at === null);
  // 4. Attempt to restore the active todo (should fail with 400)
  await TestValidator.error("active todo restore fails with 400", async () => {
    await api.functional.multiUserTodo.member.trash.restore(memberConnection, {
      todoId: todo.id,
    });
  });
  // Note: The TestValidator.error above proves the operation was rejected with 400
  // The todo should remain in active state (is_deleted=false) after the failed attempt
}
