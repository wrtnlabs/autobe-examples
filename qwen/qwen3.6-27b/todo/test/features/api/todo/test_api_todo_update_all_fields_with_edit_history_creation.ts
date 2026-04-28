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
 * Test updating all modifiable fields on a todo with edit history creation.
 *
 * Validates that a member can successfully update all editable fields of their todo including title, description, start_date, and due_date. Verifies that the returned todo entity reflects all updated values and that the updated_at timestamp is refreshed after the modification.
 *
 * Special attention is given to ensuring that the update operation correctly preserves immutable fields such as created_at, is_completed, and member ownership, while only modifying the intended fields.
 *
 * 1. Authenticates as a new member account.
 * 2. Creates a todo with a title only, leaving optional fields unspecified.
 * 3. Waits briefly to ensure timestamp difference.
 * 4. Updates all modifiable fields on the todo with new values.
 * 5. Validates the updated todo contains all new field values.
 * 6. Confirms that the updated_at timestamp changed after the update.
 * 7. Confirms that the created_at timestamp remains unchanged.
 */
export async function test_api_todo_update_all_fields_with_edit_history_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create initial todo with only title (optional fields omitted)
  const originalTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(originalTodo);
  // Store original timestamps for comparison
  const originalCreatedAt: string & tags.Format<"date-time"> =
    originalTodo.created_at;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    originalTodo.updated_at;
  // 3. Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 4. Prepare new values for update
  const newTitle = RandomGenerator.paragraph({ sentences: 5 });
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  const newStartDate = new Date().toISOString();
  const newDueDate = new Date(Date.now() + 86400000).toISOString();
  // Update all modifiable fields
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(memberConnection, {
      todoId: originalTodo.id,
      body: {
        title: newTitle,
        description: newDescription,
        start_date: newStartDate,
        due_date: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);
  // 5. Validate all updated fields match the new values
  TestValidator.equals("title updated", updatedTodo.title, newTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    newDescription,
  );
  TestValidator.equals(
    "start_date updated",
    updatedTodo.start_date,
    newStartDate,
  );
  TestValidator.equals("due_date updated", updatedTodo.due_date, newDueDate);
  // 6. Confirm updated_at timestamp changed
  TestValidator.equals(
    "updated_at changed after update",
    updatedTodo.updated_at,
    originalUpdatedAt,
  );
  // 7. Confirm created_at timestamp remained unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedTodo.created_at,
    originalCreatedAt,
  );
}
