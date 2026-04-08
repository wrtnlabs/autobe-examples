import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_update_privacy_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "http://test.com/join",
      referrer: "http://test.com",
    },
  });
  typia.assert(member1);
  // 2. First member creates a todo
  const todo1 = await api.functional.multiUserTodo.member.todos.create(
    member1Connection,
    {
      body: {
        title: "Test todo for member 1",
        description: "This is a test todo",
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // 3. Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "http://test.com/join",
      referrer: "http://test.com",
    },
  });
  typia.assert(member2);
  // 4. Attempt to update member 1's todo with member 2's connection
  // Should fail with 404 Not Found
  await TestValidator.httpError(
    "cannot update another user's todo",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.update(
        member2Connection,
        {
          todoId: todo1.id,
          body: {
            title: "Updated title",
          } satisfies IMultiUserTodoTodo.IUpdate,
        },
      );
    },
  );
}
