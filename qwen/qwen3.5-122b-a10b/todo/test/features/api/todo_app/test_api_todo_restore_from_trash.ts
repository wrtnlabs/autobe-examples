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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test restoring a soft-deleted todo from trash back to active list.
 *
 * Validates the complete restore workflow including todo creation, soft deletion, and restoration. Ensures that all todo attributes are preserved during the restore operation and the deleted_at field is properly cleared.
 *
 * The test follows a sequential flow: member authentication, todo creation with all fields, soft deletion to move to trash, restoration from trash endpoint, and comprehensive validation of the restored todo's state.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Member creates a todo with title, description, start_date, and due_date.
 * 3. Member soft-deletes the todo, setting deleted_at timestamp.
 * 4. Member restores the todo from trash using the restore endpoint.
 * 5. Validates the restored todo has deleted_at as null.
 * 6. Validates all attributes (title, description, dates, completion status) match original values.
 * 7. Validates updated_at timestamp is refreshed after restoration.
 */
export async function test_api_todo_restore_from_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo with all fields
  const beforeDeleted = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        start_date: new Date(Date.now() + 86400000).toISOString(),
        due_date: new Date(Date.now() + 604800000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(beforeDeleted);
  // Store original values for validation
  const originalTitle = beforeDeleted.title;
  const originalDescription = beforeDeleted.description;
  const originalStartDate = beforeDeleted.start_date;
  const originalDueDate = beforeDeleted.due_date;
  const originalIsCompleted = beforeDeleted.is_completed;
  const originalCreatedAt = beforeDeleted.created_at;
  // 3. Soft delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: beforeDeleted.id,
  });
  // 4. Restore the todo from trash
  const restored = await api.functional.todoApp.member.trash.restore(
    memberConnection,
    {
      todoId: beforeDeleted.id,
    },
  );
  typia.assert(restored);
  // 5. Validate deleted_at is null
  TestValidator.equals(
    "deleted_at should be null after restoration",
    restored.deleted_at,
    null,
  );
  // 6. Validate all attributes are preserved
  TestValidator.equals("title preserved", restored.title, originalTitle);
  TestValidator.equals(
    "description preserved",
    restored.description,
    originalDescription,
  );
  TestValidator.equals(
    "start_date preserved",
    restored.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "due_date preserved",
    restored.due_date,
    originalDueDate,
  );
  TestValidator.equals(
    "is_completed preserved",
    restored.is_completed,
    originalIsCompleted,
  );
  TestValidator.equals(
    "created_at unchanged",
    restored.created_at,
    originalCreatedAt,
  );
  // 7. Validate updated_at is refreshed
  TestValidator.predicate(
    "updated_at refreshed after restoration",
    restored.updated_at > beforeDeleted.updated_at,
  );
}
