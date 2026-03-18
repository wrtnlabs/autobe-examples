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

export async function test_api_todo_update_multiple_fields(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: true,
  } satisfies ITodoAppMember.IJoin;
  const authorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: credentials,
    },
  );
  typia.assert(authorized);
  const originalTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(originalTodo);
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedTodo = await api.functional.todoApp.member.todos.putByTodoid(
    memberConnection,
    {
      todoId: originalTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        due_at: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  TestValidator.equals(
    "todo id should remain the same",
    updatedTodo.id,
    originalTodo.id,
  );
  TestValidator.equals(
    "todo owner id should remain the same",
    updatedTodo.member.id,
    originalTodo.member.id,
  );
  TestValidator.equals(
    "todo owner email should remain the same",
    updatedTodo.member.email,
    originalTodo.member.email,
  );
  TestValidator.equals(
    "updated title should be persisted",
    updatedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated description should be persisted",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "start_at should remain unchanged",
    updatedTodo.start_at,
    originalTodo.start_at,
  );
  TestValidator.equals("due_at should be cleared", updatedTodo.due_at, null);
  TestValidator.equals(
    "completion status should remain unchanged",
    updatedTodo.is_completed,
    originalTodo.is_completed,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedTodo.created_at,
    originalTodo.created_at,
  );
  TestValidator.predicate(
    "updated_at should not go backwards",
    new Date(updatedTodo.updated_at).getTime() >=
      new Date(originalTodo.updated_at).getTime(),
  );
  TestValidator.equals(
    "deleted_at should remain unchanged",
    updatedTodo.deleted_at,
    originalTodo.deleted_at,
  );
}
