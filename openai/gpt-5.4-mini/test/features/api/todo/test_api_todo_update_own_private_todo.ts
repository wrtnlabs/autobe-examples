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

export async function test_api_todo_update_own_private_todo(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  const created = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  const updatedTitle = RandomGenerator.name(2);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedStartAt = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updated = await api.functional.todoApp.member.todos.putByTodoid(
    memberConnection,
    {
      todoId: created.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        start_at: updatedStartAt,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("todo id should stay the same", updated.id, created.id);
  TestValidator.equals(
    "todo owner should stay the same",
    updated.member.id,
    member.id,
  );
  TestValidator.equals(
    "todo owner email should stay the same",
    updated.member.email,
    member.email,
  );
  TestValidator.equals(
    "updated title should be saved",
    updated.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated description should be saved",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated start_at should be saved",
    updated.start_at,
    updatedStartAt,
  );
  TestValidator.equals(
    "due_at should remain unchanged",
    updated.due_at,
    created.due_at,
  );
  TestValidator.equals(
    "completion status should remain unchanged",
    updated.is_completed,
    created.is_completed,
  );
  TestValidator.equals(
    "deletion state should remain unchanged",
    updated.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updated.created_at,
    created.created_at,
  );
  TestValidator.predicate(
    "updated_at should be refreshed",
    updated.updated_at !== created.updated_at,
  );
}
