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

export async function test_api_todo_history_privacy_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(memberA);
  // 2. Member A creates a todo
  const todo: IMultiUserTodoTodo =
    await api.functional.multiUserTodo.member.todos.create(memberAConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    });
  typia.assert(todo);
  // 3. Member A edits the todo to generate edit history
  const editedTodo: IMultiUserTodoTodo =
    await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
      todoId: todo.id,
      body: {
        title: "Updated Title",
        description: "Updated Description",
      } satisfies IMultiUserTodoTodo.IUpdate,
    });
  typia.assert(editedTodo);
  // 4. Create and authenticate member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(memberB);
  // 5. Member B attempts to access member A's todo edit history
  // Should receive 404 error - privacy violation prevented
  await TestValidator.error(
    "member B cannot access member A's todo history",
    async () =>
      await api.functional.multiUserTodo.member.todos.history(
        memberBConnection,
        {
          todoId: todo.id,
        },
      ),
  );
}
