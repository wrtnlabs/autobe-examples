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
 * Test that updating a soft-deleted todo is blocked with an appropriate error.
 *
 * Validates the server-side restriction preventing modifications to todos that
 * have been soft-deleted (moved to the trash). The update endpoint must reject
 * requests targeting soft-deleted todos and return an error indicating the todo
 * is not available for modification.
 *
 * The test follows the natural lifecycle: a member registers, creates a todo,
 * soft-deletes it, and then attempts to update it. The key assertion is that
 * the update request is rejected, confirming the soft-delete state prevents
 * any further modifications until the todo is restored from the trash.
 *
 * 1. A member registers and authenticates via the join endpoint.
 * 2. The member creates a new todo with random data.
 * 3. The member soft-deletes the todo, moving it to the trash.
 * 4. The member attempts to update the soft-deleted todo with a new title.
 * 5. The system rejects the update request with an error.
 */
export async function test_api_todo_update_soft_deleted_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(createdTodo);
  // 3. Soft-delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  // 4. Attempt to update the soft-deleted todo — must be rejected
  await TestValidator.error(
    "soft-deleted todo update should be rejected",
    async () => {
      await api.functional.todoApp.member.todos.update(memberConnection, {
        todoId: createdTodo.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
}
