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

import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_permanent_delete_other_member_todo_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberOneConnection: api.IConnection = { host: connection.host };
  const memberOne = await api.functional.todoApp.auth.member.join(
    memberOneConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberOne);
  const memberTwoConnection: api.IConnection = { host: connection.host };
  const memberTwo = await api.functional.todoApp.auth.member.join(
    memberTwoConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberTwo);
  const todo = await generate_random_todo_app_member_todos_create(
    memberOneConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  await api.functional.todoApp.member.todos.erase(memberOneConnection, {
    todoId: todo.id,
  });
  await TestValidator.error(
    "other member cannot permanently delete private trashed todo",
    async () => {
      await api.functional.todoApp.member.todos.erase(memberTwoConnection, {
        todoId: todo.id,
      });
    },
  );
}
