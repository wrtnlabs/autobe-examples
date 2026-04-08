import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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
 * Test todo update with all editable fields including title, description, start date, and due date.
 *
 * Validates the complete todo update workflow including member authentication, initial todo creation, and comprehensive field updates. Ensures that all editable fields can be modified in a single update operation and that the system correctly records changes in the edit history.
 *
 * Special attention is given to verifying that the updated_at timestamp is refreshed after the update, the member ownership remains unchanged, and an edit history entry is created documenting which fields were modified and their new values.
 *
 * 1. Member registers with email, password, and display name.
 * 2. Member creates a todo with initial title, description, start date, and due date.
 * 3. Member updates the todo with new values for all editable fields.
 * 4. Validates updated todo contains all new field values, updated_at is later than original, member ownership is preserved, and edit history contains the change record.
 */
export async function test_api_todo_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create initial todo with all fields
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.content({ paragraphs: 2 });
  const initialStartDate = new Date();
  const initialDueDate = new Date(
    initialStartDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
        start_date: initialStartDate.toISOString(),
        due_date: initialDueDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // 3. Update todo with all new field values
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedStartDate = new Date(
    initialStartDate.getTime() + 14 * 24 * 60 * 60 * 1000,
  );
  const updatedDueDate = new Date(
    initialDueDate.getTime() + 14 * 24 * 60 * 60 * 1000,
  );
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: createdTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        start_date: updatedStartDate.toISOString(),
        due_date: updatedDueDate.toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Validate updated todo contains all new values
  TestValidator.equals("title updated", updatedTodo.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "start date updated",
    updatedTodo.startDate,
    updatedStartDate.toISOString(),
  );
  TestValidator.equals(
    "due date updated",
    updatedTodo.dueDate,
    updatedDueDate.toISOString(),
  );
  // 5. Validate timestamps
  TestValidator.predicate(
    "updated_at is later than created_at",
    () =>
      new Date(updatedTodo.updatedAt).getTime() >
      new Date(createdTodo.updatedAt).getTime(),
  );
  TestValidator.predicate(
    "updated_at is later than original updated_at",
    () =>
      new Date(updatedTodo.updatedAt).getTime() >
      new Date(createdTodo.createdAt).getTime(),
  );
  // 6. Validate member ownership preserved
  TestValidator.equals(
    "member id preserved",
    updatedTodo.member.id,
    authResult.id,
  );
  TestValidator.equals(
    "member email preserved",
    updatedTodo.member.display_name,
    authResult.display_name,
  );
  // 7. Validate completion status unchanged
  TestValidator.equals("isCompleted unchanged", updatedTodo.isCompleted, false);
  TestValidator.equals("isDeleted unchanged", updatedTodo.isDeleted, false);
  // 8. Validate edit history was created
  TestValidator.predicate(
    "edit history has entries",
    () => updatedTodo.editHistories.length > 0,
  );
  const latestHistory = updatedTodo.editHistories[0];
  typia.assertGuard(latestHistory!);
  TestValidator.equals(
    "history title recorded",
    latestHistory.title,
    updatedTitle,
  );
  TestValidator.equals(
    "history description recorded",
    latestHistory.description,
    updatedDescription,
  );
  TestValidator.equals(
    "history startedAt recorded",
    latestHistory.startedAt,
    updatedStartDate.toISOString(),
  );
  TestValidator.equals(
    "history dueAt recorded",
    latestHistory.dueAt,
    updatedDueDate.toISOString(),
  );
}
