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
 * Test partial update of todo fields while preserving unchanged values.
 *
 * Validates the partial update pattern where a member creates a todo with all fields populated, then updates only the title and description while leaving date fields unchanged. Ensures that only provided fields are modified, unchanged fields retain their original values, and the update timestamp is properly updated.
 *
 * The test verifies the integrity of partial update operations to prevent unintended field modifications and confirms that the system correctly handles selective field updates without affecting other properties.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Create initial todo with all fields: title, description, start_date, and due_date.
 * 3. Store original values for comparison.
 * 4. Perform partial update with only title and description changed.
 * 5. Validate that title and description are updated to new values.
 * 6. Validate that start_date and due_date remain unchanged from original.
 * 7. Validate that updated_at timestamp has changed from created_at.
 */
export async function test_api_todo_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create initial todo with all fields
  const startDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const dueDate = new Date(Date.now() + 604800000).toISOString(); // next week
  const originalTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        start_date: startDate,
        due_date: dueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(originalTodo);
  // 3. Store original values for comparison
  const originalTitle = originalTodo.title;
  const originalDescription = originalTodo.description;
  const originalStartDate = originalTodo.start_date;
  const originalDueDate = originalTodo.due_date;
  const originalUpdatedAt = originalTodo.updated_at;
  // 4. Perform partial update - only title and description
  const newTitle = RandomGenerator.name(4);
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: originalTodo.id,
      body: {
        title: newTitle,
        description: newDescription,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 5. Validate title and description are updated
  TestValidator.equals("title updated", updatedTodo.title, newTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    newDescription,
  );
  // 6. Validate start_date and due_date remain unchanged
  TestValidator.equals(
    "start_date unchanged",
    updatedTodo.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "due_date unchanged",
    updatedTodo.due_date,
    originalDueDate,
  );
  // 7. Validate updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedTodo.updated_at,
    originalUpdatedAt,
  );
}
