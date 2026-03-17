import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_update_full_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and create an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a todo item to update
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(createdTodo);
  // Step 3: Prepare updated field values with proper type casting for tagged types
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 }) as string &
    tags.MinLength<1>;
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const startedAt = new Date(
    Date.now() + 1000 * 60 * 60,
  ).toISOString() as string & tags.Format<"date-time">;
  const dueAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString() as string & tags.Format<"date-time">;
  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    is_completed: false,
    started_at: startedAt,
    due_at: dueAt,
  } satisfies ITodoAppTodo.IUpdate;
  // Step 4: Call the update endpoint
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: createdTodo.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);
  // Step 5: Validate the returned entity
  TestValidator.equals(
    "id matches original todoId",
    updatedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo_app_member_id matches authenticated member",
    updatedTodo.todo_app_member_id,
    member.id,
  );
  TestValidator.equals(
    "title reflects updated value",
    updatedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description reflects updated value",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "is_completed is false",
    updatedTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "started_at reflects provided value",
    updatedTodo.started_at,
    startedAt,
  );
  TestValidator.equals(
    "due_at reflects provided value",
    updatedTodo.due_at,
    dueAt,
  );
  TestValidator.equals(
    "trashed_at is null (still active)",
    updatedTodo.trashed_at,
    null,
  );
  TestValidator.predicate(
    "updated_at is later than or equal to created_at",
    new Date(updatedTodo.updated_at) >= new Date(updatedTodo.created_at),
  );
}
