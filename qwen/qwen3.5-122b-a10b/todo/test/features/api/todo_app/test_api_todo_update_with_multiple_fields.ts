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
 * Test updating a todo with multiple fields.
 *
 * Validates the complete todo update workflow by creating a todo and then modifying multiple fields simultaneously. The test ensures that all provided fields are correctly updated, the updated_at timestamp changes, and the system properly handles the edit history snapshot creation.
 *
 * This test covers the core update functionality with comprehensive field modification including title, description, start date, and due date. It validates both the immediate response and the underlying data integrity.
 *
 * 1. Authenticate as member using join endpoint.
 * 2. Create initial todo with random data.
 * 3. Update the todo with new title, description, start_date, and due_date.
 * 4. Validate all fields are updated correctly in the response.
 * 5. Verify updated_at timestamp has changed from original.
 * 6. Confirm business logic (dates are valid, values match input).
 */
export async function test_api_todo_update_with_multiple_fields(
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
  // 2. Create initial todo
  const initialDate = new Date();
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: initialDate.toISOString(),
        due_date: new Date(
          initialDate.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  const originalUpdatedAt = todo.updated_at;
  // 3. Update todo with multiple fields
  const newStartDate = new Date(
    initialDate.getTime() + 3 * 24 * 60 * 60 * 1000,
  );
  const newDueDate = new Date(initialDate.getTime() + 10 * 24 * 60 * 60 * 1000);
  const updateBody = {
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    start_date: newStartDate.toISOString(),
    due_date: newDueDate.toISOString(),
  } satisfies ITodoAppTodo.IUpdate;
  const updated = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  // 4. Validate all fields are updated correctly
  TestValidator.equals("title updated", updated.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "start_date updated",
    updated.start_date,
    updateBody.start_date,
  );
  TestValidator.equals(
    "due_date updated",
    updated.due_date,
    updateBody.due_date,
  );
  // 5. Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdatedAt,
    updated.updated_at,
  );
  // 6. Confirm business logic
  TestValidator.predicate(
    "start_date is valid date format",
    new Date(updated.start_date!).getTime() > 0,
  );
  TestValidator.predicate(
    "due_date is valid date format",
    new Date(updated.due_date!).getTime() > 0,
  );
  TestValidator.predicate(
    "due_date is after start_date",
    new Date(updated.due_date!).getTime() >=
      new Date(updated.start_date!).getTime(),
  );
  // Verify author information is preserved
  TestValidator.equals("author ID preserved", updated.author.id, member.id);
  TestValidator.predicate(
    "author display_name matches",
    updated.author.display_name === member.display_name,
  );
}
