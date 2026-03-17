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

export async function test_api_todo_restore_not_in_trash(
  connection: api.IConnection,
): Promise<void> {
  // Create first member connection and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // Create an active todo (not deleted) using utility function
  const todo1 = await generate_random_todo_app_member_todos_create(
    member1Connection,
    {},
  );
  typia.assert(todo1);
  // Test 1: Attempt to restore active todo (not in trash) → should fail
  await TestValidator.error("restore active todo should fail", async () => {
    await api.functional.todoApp.member.todos.restore(member1Connection, {
      todoId: todo1.id,
    });
  });
  // Test 2: Attempt to restore non-existent todo → should fail
  await TestValidator.error(
    "restore non-existent todo should fail",
    async () => {
      await api.functional.todoApp.member.todos.restore(member1Connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Create second member connection and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Create a todo for second member
  const todo2 = await generate_random_todo_app_member_todos_create(
    member2Connection,
    {},
  );
  typia.assert(todo2);
  // Test 3: First member attempts to restore second member's todo → should fail
  await TestValidator.error(
    "restore another member's todo should fail",
    async () => {
      await api.functional.todoApp.member.todos.restore(member1Connection, {
        todoId: todo2.id,
      });
    },
  );
}
