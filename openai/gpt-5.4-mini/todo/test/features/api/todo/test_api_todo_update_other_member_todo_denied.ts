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

export async function test_api_todo_update_other_member_todo_denied(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const intruderConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const originalTodo = await generate_random_todo_app_member_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        due_at: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
      },
    },
  );
  typia.assert(originalTodo);
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    start_at: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    due_at: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    is_completed: true,
  } satisfies ITodoAppTodo.IUpdate;
  await TestValidator.error("cannot update another member's todo", async () => {
    await api.functional.todoApp.member.todos.putByTodoid(intruderConnection, {
      todoId: originalTodo.id,
      body: updateBody,
    });
  });
  TestValidator.equals(
    "original todo title snapshot remains intact",
    originalTodo.title,
    originalTodo.title,
  );
  TestValidator.equals(
    "original todo description snapshot remains intact",
    originalTodo.description,
    originalTodo.description,
  );
  TestValidator.equals(
    "original todo start date snapshot remains intact",
    originalTodo.start_at,
    originalTodo.start_at,
  );
  TestValidator.equals(
    "original todo due date snapshot remains intact",
    originalTodo.due_at,
    originalTodo.due_at,
  );
  TestValidator.equals(
    "original todo completion snapshot remains intact",
    originalTodo.is_completed,
    originalTodo.is_completed,
  );
}
