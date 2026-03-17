import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

/**
 * Test that a member cannot update another member's todo.
 *
 * Privacy Enforcement Test:
 * This test validates the strict privacy boundary where each member's todos
 * are completely private. When a member attempts to update a todo belonging
 * to another member, the system returns 404 Not Found rather than 403 Forbidden
 * to prevent information leakage about the existence of other members' todos.
 */
export async function test_api_todo_update_cross_user_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (todo owner) connection and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a todo
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "Member A secret task",
      },
    },
  );
  typia.assert(todo);
  // 3. Create Member B (different user) connection and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Member B attempts to update Member A's todo
  // Should fail with 404 Not Found (not 403 to prevent info leakage)
  await TestValidator.httpError(
    "Member B cannot update Member A's todo",
    404,
    async () =>
      await api.functional.privateTodoApp.member.todos.update(
        memberBConnection,
        {
          todoId: todo.id,
          body: {
            title: "Trying to modify someone else todo",
          } satisfies IPrivateTodoAppTodo.IUpdate,
        },
      ),
  );
}
