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

export async function test_api_todo_trash_permanent_delete_cascades_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_at: new Date(Date.now() + 60000).toISOString(),
        due_at: new Date(Date.now() + 120000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  const updated = await api.functional.todoApp.member.todos.putByTodoid(
    memberConnection,
    {
      todoId: created.id,
      body: {
        title: `${created.title} updated`,
        description: `${created.description ?? ""} revised`,
        start_at: created.start_at,
        due_at: created.due_at,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updated);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: created.id,
  });
  await api.functional.todoApp.member.todos.trash.erase(memberConnection, {
    todoId: created.id,
  });
}
