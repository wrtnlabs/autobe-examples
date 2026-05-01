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
 * Test that duplicate soft-deletion of a todo is rejected with 409 Conflict.
 *
 * Validates the idempotency guard on the soft-delete operation. A todo can only be soft-deleted once while it is active. After the initial soft-delete moves the todo to the trash by setting its deleted_at timestamp, a second soft-delete attempt on the same todo must be rejected with a 409 Conflict response. This ensures clear state transitions — an already-trashed todo cannot be soft-deleted again without first being restored from the trash.
 *
 * The test also implicitly verifies that the first soft-delete succeeds (returning void rather than throwing), confirming the todo was active before the operation and that ownership validation passed.
 *
 * 1. Member registers and authenticates via join to establish an authenticated session.
 * 2. Member creates a new todo which is active by default (deleted_at is null).
 * 3. Member soft-deletes the todo — the operation succeeds, moving it to the trash.
 * 4. Member attempts to soft-delete the same todo a second time while it is already trashed.
 * 5. Verifies the second attempt is rejected with a 409 Conflict HTTP error.
 */
export async function test_api_todo_soft_delete_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  // 3. Soft-delete the todo — first attempt must succeed
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Attempt to soft-delete the same todo again — must be rejected with 409
  await TestValidator.httpError(
    "duplicate soft-delete rejected",
    409,
    async () => {
      await api.functional.todoApp.member.todos.erase(memberConnection, {
        todoId: todo.id,
      });
    },
  );
}
