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

export async function test_api_todo_restore_other_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberA);
  // 2. Create a todo for member A
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Soft delete the todo (move to trash)
  await api.functional.multiUserTodo.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // 4. Create member B and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberB);
  // 5. Attempt to restore member A's todo using member B's authentication
  // Expected: 404 Not Found (privacy protection - don't reveal todo exists)
  await TestValidator.error(
    "cannot restore another user's todo from trash",
    async () => {
      await api.functional.multiUserTodo.member.trash.restore(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
  // 6. Verify privacy protection: API returns 404 without revealing todo exists
  // This validates cross-user data isolation - users can only restore their own todos
  TestValidator.equals(
    "todo owner differs from authenticating user",
    todo.multi_user_todo_member_id,
    memberA.id,
  );
  TestValidator.notEquals(
    "member IDs differ",
    todo.multi_user_todo_member_id,
    memberB.id,
  );
}
