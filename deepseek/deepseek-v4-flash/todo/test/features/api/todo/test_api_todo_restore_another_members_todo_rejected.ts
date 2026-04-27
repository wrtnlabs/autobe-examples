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
 * Test that a member cannot restore a todo belonging to another member.
 *
 * Validates authorization boundaries for the restore endpoint. The API specification states that restoring another member's todo must be rejected with 403 Forbidden. This test ensures that data isolation is properly enforced even for lifecycle operations like restore.
 *
 * 1. Member A registers via the join endpoint.
 * 2. Member B registers via the join endpoint with different credentials.
 * 3. Member B creates a todo using the generation utility.
 * 4. Member B soft-deletes the todo to move it to trash.
 * 5. Member A attempts to restore Member B's deleted todo.
 * 6. Verifies the restore attempt fails with 403 Forbidden.
 */
export async function test_api_todo_restore_another_members_todo_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Register as Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member B creates a todo using the generate utility
  const todo = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {},
  );
  typia.assert(todo);
  // 4. Member B soft-deletes the todo to move it to trash
  await api.functional.todoApp.member.todos.eraseByTodoid(memberBConnection, {
    todoId: todo.id,
  });
  // 5-6. Member A attempts to restore Member B's deleted todo
  // Expect 403 Forbidden per API spec
  await TestValidator.httpError(
    "Member A cannot restore Member B's deleted todo",
    403,
    async () => {
      await api.functional.todoApp.member.todos.restore(memberAConnection, {
        todoId: todo.id,
      });
    },
  );
}
