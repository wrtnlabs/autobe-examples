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

export async function test_api_todo_update_private_todo_success(
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
        start_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(created);
  const updatedTitle = `${created.title} updated`;
  const updatedDescription = `${created.description ?? "description"} changed`;
  const updatedStartAt = new Date(
    Date.now() + 3 * 60 * 60 * 1000,
  ).toISOString();
  const updatedDueAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  const expectedCompleted = !created.is_completed;
  const updated = await api.functional.todoApp.member.todos.patchByTodoid(
    memberConnection,
    {
      todoId: created.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        start_at: updatedStartAt,
        due_at: updatedDueAt,
        is_completed: expectedCompleted,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("todo id should stay the same", updated.id, created.id);
  TestValidator.equals(
    "todo owner id should stay the same",
    updated.member.id,
    created.member.id,
  );
  TestValidator.equals(
    "todo owner email should stay the same",
    updated.member.email,
    created.member.email,
  );
  TestValidator.equals(
    "todo title should be updated",
    updated.title,
    updatedTitle,
  );
  TestValidator.equals(
    "todo description should be updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "todo start_at should be updated",
    updated.start_at,
    updatedStartAt,
  );
  TestValidator.equals(
    "todo due_at should be updated",
    updated.due_at,
    updatedDueAt,
  );
  TestValidator.equals(
    "todo completion should toggle",
    updated.is_completed,
    expectedCompleted,
  );
  TestValidator.equals(
    "todo created_at should remain stable",
    updated.created_at,
    created.created_at,
  );
  TestValidator.predicate(
    "todo should remain active after update",
    updated.deleted_at === null,
  );
}
