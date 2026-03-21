import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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

export async function test_api_todo_restore_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A who owns the todo
  const memberA: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        displayName: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  const memberAConnection: api.IConnection = { host: connection.host };
  memberAConnection.headers = {
    Authorization: `Bearer ${memberA.token.access}`,
  };
  // 2. Create a todo as member A
  const todo: IMultiUserTodoTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(todo);
  // 3. Member A soft deletes the todo (moves to trash)
  await api.functional.multiUserTodo.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // 4. Authenticate as member B with different credentials
  const memberB: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        displayName: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  const memberBConnection: api.IConnection = { host: connection.host };
  memberBConnection.headers = {
    Authorization: `Bearer ${memberB.token.access}`,
  };
  // 5. Attempt to restore member A's todo as member B - should fail
  await TestValidator.error(
    "Non-owner cannot restore another user's todo",
    async () =>
      await api.functional.multiUserTodo.member.todos.restore(
        memberBConnection,
        {
          todoId: todo.id,
        },
      ),
  );
}
