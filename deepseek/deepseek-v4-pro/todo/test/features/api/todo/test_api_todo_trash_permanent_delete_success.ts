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
 * Test the complete lifecycle of permanent deletion from trash.
 *
 * Validates that a soft-deleted todo can be permanently purged from the trash,
 * confirming the todo and all its edit history are irreversibly removed. The
 * first permanent delete succeeds with a void response (204 No Content). The
 * test also verifies the 'Permanent Delete of Already Purged Todo' business
 * rule by attempting a second permanent delete on the same todo, which must
 * yield a 404 Not Found response confirming the resource no longer exists.
 *
 * 1. Member joins and authenticates via authorize_member_join.
 * 2. Member creates a todo with title and description.
 * 3. Member soft-deletes the todo to move it into the trash.
 * 4. Member permanently deletes the todo from trash (expects 204 No Content).
 * 5. Member attempts to permanently delete the same todo again (expects 404 Not Found).
 */
export async function test_api_todo_trash_permanent_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Soft-delete the todo (move to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Permanently delete from trash (204 No Content)
  await api.functional.todoApp.member.todos.trash.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Attempt permanent delete again — must fail with 404
  await TestValidator.httpError(
    "permanent delete of already purged todo returns 404",
    404,
    async () =>
      api.functional.todoApp.member.todos.trash.erase(memberConnection, {
        todoId: todo.id,
      }),
  );
}
