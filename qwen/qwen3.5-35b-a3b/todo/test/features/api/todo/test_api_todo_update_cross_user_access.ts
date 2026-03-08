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

export async function test_api_todo_update_cross_user_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberA);
  // 2. Create a todo owned by member A
  const todo: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        start_date: RandomGenerator.date(new Date(), 30 * 24 * 60 * 60 * 1000).toISOString(),
        due_date: RandomGenerator.date(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberB);
  // 4. Attempt to update member A's todo using member B's credentials
  await TestValidator.httpError(
    "member B cannot update member A's todo",
    403,
    async () =>
      await api.functional.todoApp.member.todos.update(memberBConnection, {
        todoId: todo.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ITodoAppTodo.IUpdate,
      }),
  );
  // 5. Verify member A's todo remains unchanged by updating with member A's credentials
  const todoAfterAttempt: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(memberAConnection, {
      todoId: todo.id,
      body: {},
    });
  typia.assert(todoAfterAttempt);
  TestValidator.equals(
    "todo unchanged after unauthorized update attempt",
    todoAfterAttempt,
    todo,
  );
  // 6. Verify data isolation - member A can still update their own todo
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(memberAConnection, {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);
  TestValidator.notEquals(
    "todo was updated by member A",
    updatedTodo,
    todoAfterAttempt,
  );
}