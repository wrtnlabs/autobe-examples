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
 * Test that soft-deleting an already deleted todo (already in trash) is rejected.
 *
 * This test validates the business rule that a todo cannot be soft-deleted twice. After the first erase succeeds and populates the `deleted_at` timestamp, a second attempt to erase the same todo must be rejected with a client-error HTTP status, preventing duplicate trash entries.
 *
 * 1. Register a new member via `authorize_member_join`.
 * 2. Create a todo via `generate_random_todo_app_member_todos_create`.
 * 3. First soft-delete — should succeed (no error).
 * 4. Second soft-delete — must be rejected with an HTTP error (400, 409, or 422).
 */
export async function test_api_todo_soft_delete_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. First soft-delete should succeed
  await api.functional.todoApp.member.todos.erase.eraseByTodoid(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  // 4. Second soft-delete should be rejected (already in trash)
  await TestValidator.httpError(
    "soft delete already deleted todo",
    [400, 409, 422],
    async () => {
      await api.functional.todoApp.member.todos.erase.eraseByTodoid(
        memberConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
}
