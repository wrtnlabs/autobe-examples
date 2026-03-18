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

export async function test_api_todo_detail_view_other_member_private_todo_denied(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const otherConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const todo: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_at: typia.random<string & tags.Format<"date-time">>(),
        due_at: typia.random<string & tags.Format<"date-time">>(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  await TestValidator.httpError(
    "other member must not access private todo detail",
    [401, 403, 404],
    async () => {
      await api.functional.todoApp.member.todos.at(otherConnection, {
        todoId: todo.id,
      });
    },
  );
}
