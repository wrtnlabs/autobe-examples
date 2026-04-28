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
 * Test that a member cannot restore another member's soft-deleted todo.
 *
 * Verifies data isolation between members by ensuring that only the todo owner can perform restore operations on deleted todos. Member A creates and soft-deletes a todo, then Member B (a different registered member) attempts to restore it. The restore endpoint must reject the request with a 403 Forbidden error, confirming that cross-member access is properly blocked.
 *
 * Special attention is given to validating that the authorization check occurs before any restore logic, preventing unauthorized members from even discovering the existence of another member's todos through error messages or side effects.
 *
 * 1. Member A authenticates and registers a new member account.
 * 2. Member A creates a todo item with a random title.
 * 3. Member A soft-deletes the todo, moving it to trash.
 * 4. Member B authenticates as a separate member account.
 * 5. Member B attempts to restore Member A's soft-deleted todo using the todo ID.
 * 6. The restore endpoint rejects the request with 403 Forbidden error, enforcing strict data isolation.
 */
export async function test_api_todo_restore_unauthorized_member_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A authenticates and registers
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Member A creates a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Member A soft-deletes the todo
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // 4. Member B authenticates as a different member
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 5. Member B attempts to restore Member A's todo - should fail with 403 Forbidden
  await TestValidator.httpError(
    "unauthorized member cannot restore another member's todo",
    403,
    () =>
      api.functional.todoApp.member.todos.restore(memberBConnection, {
        todoId: todo.id,
      }),
  );
}
