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

export async function test_api_todo_soft_delete_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Alice registration and login
  const aliceConnection: api.IConnection = { host: connection.host };
  const alice = await authorize_member_join(aliceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(alice);
  // 2. Alice creates a todo
  const aliceTodo = await api.functional.todoApp.member.todos.create(
    aliceConnection,
    {
      body: {
        title: "My Task",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(aliceTodo);
  // 3. Bob registration and login
  const bobConnection: api.IConnection = { host: connection.host };
  const bob = await authorize_member_join(bobConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(bob);
  // 4. Bob attempts to delete Alice's todo (should be rejected)
  await TestValidator.error("cannot delete another user's todo", async () => {
    await api.functional.todoApp.member.todos.erase(bobConnection, {
      todoId: aliceTodo.id,
    });
  });
  // 5. Verify Alice's todo still exists and was not deleted
  TestValidator.equals("todo still exists", aliceTodo.is_deleted, false);
  TestValidator.equals("todo belongs to alice", aliceTodo.author.id, alice.id);
}
