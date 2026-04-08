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
 * Test that permanent deletion fails when the todo is not in trash (still active).
 *
 * Validates that the permanent deletion endpoint correctly rejects attempts to delete active todos that have not been soft-deleted first. The system should only allow permanent deletion of todos that are currently in the trash (have a non-null deleted_at timestamp).
 *
 * 1. Authenticate as a member to access private todo operations.
 * 2. Create a new active todo with title (deleted_at is null by default).
 * 3. Attempt to permanently delete the active todo without soft-deleting it first.
 * 4. Verify the system rejects the request with an appropriate error (404 or 400).
 */
export async function test_api_todo_permanent_deletion_not_in_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create an active todo (not in trash)
  const activeTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(activeTodo);
  // Verify the todo is active (not in trash)
  TestValidator.equals(
    "todo is active (not in trash)",
    activeTodo.deleted_at,
    null,
  );
  // 3. Attempt to permanently delete the active todo (should fail)
  await TestValidator.httpError(
    "permanent deletion fails for active todo",
    [400, 404],
    async () =>
      await api.functional.todoApp.member.trash.erase(memberConnection, {
        todoId: activeTodo.id,
      }),
  );
}
