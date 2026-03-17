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

export async function test_api_todo_restore_from_trash_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new todo with all optional fields populated
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        started_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        due_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    },
  );
  typia.assert(todo);
  // Capture creation-time values
  const originalId = todo.id;
  const originalMemberId = todo.todo_app_member_id;
  const originalTitle = todo.title;
  const originalDescription = todo.description;
  const originalIsCompleted = todo.is_completed;
  const originalStartedAt = todo.started_at;
  const originalDueAt = todo.due_at;
  const originalCreatedAt = todo.created_at;
  const preRestoreUpdatedAt = todo.updated_at;
  // 3. Move the todo to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Restore the todo from trash
  const restored = await api.functional.todoApp.member.todos.restore(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(restored);
  // 5. Validate all assertions
  // trashed_at should be null after restoration
  TestValidator.equals(
    "trashed_at is null after restore",
    restored.trashed_at,
    null,
  );
  // All original fields must be preserved
  TestValidator.equals("title preserved", restored.title, originalTitle);
  TestValidator.equals(
    "description preserved",
    restored.description,
    originalDescription,
  );
  TestValidator.equals(
    "is_completed preserved",
    restored.is_completed,
    originalIsCompleted,
  );
  TestValidator.equals(
    "started_at preserved",
    restored.started_at,
    originalStartedAt,
  );
  TestValidator.equals("due_at preserved", restored.due_at, originalDueAt);
  // Identity fields must not change
  TestValidator.equals("id unchanged", restored.id, originalId);
  TestValidator.equals(
    "todo_app_member_id unchanged",
    restored.todo_app_member_id,
    originalMemberId,
  );
  TestValidator.equals(
    "created_at unchanged",
    restored.created_at,
    originalCreatedAt,
  );
  // updated_at must be >= pre-restore updated_at
  TestValidator.predicate(
    "updated_at >= pre-restore updated_at",
    new Date(restored.updated_at) >= new Date(preRestoreUpdatedAt),
  );
}
