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

export async function test_api_todo_trash_detail_after_permanent_deletion(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      },
    },
  );
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  const trashDetail = await api.functional.todoApp.member.todos.trash.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(trashDetail);
  TestValidator.equals("trash detail id", trashDetail.id, todo.id);
  TestValidator.equals("trash detail title", trashDetail.title, todo.title);
  await api.functional.todoApp.member.todos.trash.erase(memberConnection, {
    todoId: todo.id,
  });
  await TestValidator.error(
    "trash detail should fail after permanent deletion",
    async () => {
      await api.functional.todoApp.member.todos.trash.at(memberConnection, {
        todoId: todo.id,
      });
    },
  );
}
