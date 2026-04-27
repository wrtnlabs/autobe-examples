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
 * Test that a member cannot soft-delete a todo belonging to another member.
 *
 * Validates strict data isolation between members when attempting to soft-delete
 * a todo. The system must return a not-found error without distinguishing between
 * non-existent and inaccessible resources, preserving data privacy.
 *
 * 1. Register member A via authorize_member_join.
 * 2. Member A creates a todo via generate_random_todo_app_member_todos_create.
 * 3. Register member B via authorize_member_join with a different email.
 * 4. Using member B's connection, attempt to soft-delete member A's todo via
 *    api.functional.todoApp.member.todos.erase.eraseByTodoid.
 * 5. Validate that the operation returns a 404 error.
 */
export async function test_api_todo_soft_delete_other_members_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAResult = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAResult);
  // 2. Member A creates a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // 3. Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBResult = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberBResult);
  // 4. Member B attempts to soft-delete member A's todo - should fail with 404
  await TestValidator.httpError(
    "cannot soft-delete another member's todo",
    404,
    async () => {
      await api.functional.todoApp.member.todos.erase.eraseByTodoid(
        memberBConnection,
        { todoId: todo.id },
      );
    },
  );
}
