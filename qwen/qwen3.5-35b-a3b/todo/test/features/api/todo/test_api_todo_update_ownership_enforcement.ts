import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

/**
 * Test ownership enforcement for todo updates.
 * Creates two member accounts and verifies that a member cannot update another member's todo.
 */
export async function test_api_todo_update_ownership_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://test.example.com/join",
      referrer: "http://test.example.com/",
      ip: "127.0.0.1",
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(member1);
  // 2. Create a todo as first member
  const todo = await api.functional.multiUserTodoApp.member.todos.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.alphabets(10),
        description: "Test todo",
      } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      href: "http://test.example.com/join",
      referrer: "http://test.example.com/",
      ip: "127.0.0.1",
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(member2);
  // 4. Attempt to update first member's todo as second member (should fail with 403)
  await TestValidator.httpError(
    "second member cannot update first member's todo",
    403,
    async () =>
      await api.functional.multiUserTodoApp.member.todos.update(
        member2Connection,
        {
          todoId: todo.id,
          body: {
            title: "Updated title",
          } satisfies IMultiUserTodoAppTodo.IUpdate,
        },
      ),
  );
}
