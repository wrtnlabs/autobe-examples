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
 * Test that members cannot restore another user's deleted todo from trash.
 *
 * Validates the authorization boundary when attempting to restore a soft-deleted todo that belongs to a different user. Two separate member accounts are created and authenticated, then the test verifies that cross-user trash restoration is properly rejected by the server.
 *
 * The test follows this workflow:
 *
 * 1. Member A registers and authenticates with the system.
 * 2. Member A creates a todo task with random content.
 * 3. Member A soft-deletes the todo, moving it to their trash.
 * 4. Member B registers and authenticates with a different account.
 * 5. Member B attempts to restore Member A's deleted todo using the todoId.
 * 6. The restore operation must fail with 403 Forbidden or 404 Not Found.
 *
 * This validates that the trash restore endpoint enforces strict ownership checks and prevents users from accessing or modifying other users' deleted todos.
 */
export async function test_api_todo_restore_another_user_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Member A soft-deletes the todo to trash
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // 4. Member B registers and authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Member B attempts to restore Member A's deleted todo
  // This should fail with 403 Forbidden or 404 Not Found
  await TestValidator.httpError(
    "cannot restore another user's todo",
    [403, 404],
    async () => {
      await api.functional.todoApp.member.trash.restore(memberBConnection, {
        todoId: todo.id,
      });
    },
  );
}
