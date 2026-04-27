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
 * Test that restoring an already active (non-deleted) todo succeeds as a no-op.
 *
 * Validates the restore endpoint's behavior when called on a todo that has never been soft-deleted. The server specification states that restoring an active todo is a no-op — the todo is returned in its current state unchanged, and no modifications are made to the record.
 *
 * Special attention is given to verifying that all attributes, including timestamps and the `deleted_at` field, remain exactly as they were before the restore call.
 *
 * 1. Register as a new member using the join utility.
 * 2. Create a todo in the active state (deleted_at = null) using the generate utility.
 * 3. Call the restore endpoint on the active todo.
 * 4. Validate that `deleted_at` is still null and all attributes are unchanged from the original.
 */
export async function test_api_todo_restore_active_todo_noop(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a member using the authorize utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "MyP@ssw0rd!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo using the generate utility
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // Verify the todo starts as active
  TestValidator.predicate("todo is active at start", todo.deleted_at === null);
  // 3. Attempt to restore the already-active todo (no-op expected)
  const restored = await api.functional.todoApp.member.todos.restore(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(restored);
  // 4. Verify the restored todo has deleted_at = null (still active)
  TestValidator.predicate(
    "restored todo deleted_at is null",
    restored.deleted_at === null,
  );
  // 5. Verify all attributes are unchanged (true no-op)
  TestValidator.equals("todo attributes unchanged", todo, restored);
}
