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
 * Test that updating a soft-deleted (trashed) todo is properly rejected.
 *
 * This test validates the business rule enforcement that prevents editing
 * todos that have been moved to the trash. The system should reject any
 * update attempt on a trashed todo with an appropriate error, preserving
 * the data integrity of items in the trash.
 *
 * A member is registered, a todo is created, then soft-deleted. After
 * establishing the trashed precondition, the test attempts to update the
 * todo and expects a rejection error. The original trashed state of the
 * item is verified to remain unchanged.
 *
 * 1. Register member via POST /todoApp/auth/member/join.
 * 2. Create a new todo via POST /todoApp/member/todos.
 * 3. Soft-delete the todo via DELETE /todoApp/member/todos/{todoId}.
 * 4. Attempt to update the trashed todo via PUT /todoApp/member/todos/{todoId}
 *    — expect rejection (business rule: deleted_at IS NOT NULL).
 * 5. Validate that the original values remain unchanged.
 */
export async function test_api_todo_update_trashed_rejected(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Register a member
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  //----
  // 2. Create a todo
  //----
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  //----
  // 3. Soft-delete the todo to move it to trash
  //----
  await api.functional.todoApp.member.todos.eraseByTodoid(memberConnection, {
    todoId: todo.id,
  });
  //----
  // 4. Attempt to update the trashed todo — should be rejected
  //----
  await TestValidator.error(
    "update trashed todo should be rejected",
    async () => {
      await api.functional.todoApp.member.todos.update(memberConnection, {
        todoId: todo.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
}
