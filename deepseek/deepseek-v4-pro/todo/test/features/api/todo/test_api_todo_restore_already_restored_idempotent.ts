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
 * Test idempotent behavior of restoring an already-restored todo from the trash.
 *
 * Validates that the restore endpoint handles the edge case where a todo has already been restored from the trash. According to the specification, when a race condition or concurrent restore occurs and the todo is already in the active state, the restore operation should succeed idempotently rather than producing an error.
 *
 * The test confirms that calling restore twice on the same todo returns the same restored todo on both calls with all original data preserved, verifying the idempotent behavior specified for concurrent restore scenarios.
 *
 * 1. Authenticate a new member via the join endpoint with random credentials.
 * 2. Create a todo with all fields populated using the generation utility.
 * 3. Soft-delete the todo to move it to the trash.
 * 4. Call restore the first time and verify the todo returns with all original data intact.
 * 5. Call restore a second time on the already-restored todo and verify it succeeds idempotently with the same data.
 */
export async function test_api_todo_restore_already_restored_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo with all fields
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Soft-delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. First restore — should succeed
  const restored1 = await api.functional.todoApp.member.todos.trash.restore(
    memberConnection,
    { todoId: todo.id },
  );
  typia.assert(restored1);
  TestValidator.equals(
    "restored todo id matches original",
    restored1.id,
    todo.id,
  );
  TestValidator.equals(
    "restored todo title preserved",
    restored1.title,
    todo.title,
  );
  // 5. Second restore — idempotent success
  const restored2 = await api.functional.todoApp.member.todos.trash.restore(
    memberConnection,
    { todoId: todo.id },
  );
  typia.assert(restored2);
  TestValidator.equals(
    "second restore id matches original",
    restored2.id,
    todo.id,
  );
  TestValidator.equals(
    "second restore title preserved",
    restored2.title,
    todo.title,
  );
}
