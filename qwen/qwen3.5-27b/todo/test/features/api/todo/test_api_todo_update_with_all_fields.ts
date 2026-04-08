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
 * Test updating a todo item with all editable fields including title, description, start date, and due date.
 *
 * Validates the complete todo update workflow including member authentication, todo creation, and updating all mutable fields. Ensures that the update operation correctly modifies all provided fields while preserving the completion status and ownership.
 *
 * Special attention is given to verifying that all date fields are properly formatted and that the updated_at timestamp is refreshed after the edit operation.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Create a todo with a title and optional description.
 * 3. Update the todo with all editable fields: new title, new description, start_date, and due_date.
 * 4. Validate that all fields are correctly updated and timestamps are refreshed.
 */
export async function test_api_todo_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create initial todo
  const originalTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(originalTodo);
  // Store original values for comparison
  const originalTitle = originalTodo.title;
  const originalDescription = originalTodo.description;
  const originalCreatedAt = originalTodo.created_at;
  const originalCompleted = originalTodo.completed;
  // 3. Update todo with all fields
  const startDate = new Date().toISOString();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: originalTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: startDate,
        due_date: dueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Validate update results
  TestValidator.notEquals(
    "title changed from original",
    updatedTodo.title,
    originalTitle,
  );
  TestValidator.notEquals(
    "description changed from original",
    updatedTodo.description,
    originalDescription,
  );
  TestValidator.equals("start_date set", updatedTodo.start_date, startDate);
  TestValidator.equals("due_date set", updatedTodo.due_date, dueDate);
  TestValidator.equals(
    "completed status unchanged",
    updatedTodo.completed,
    originalCompleted,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedTodo.updated_at) > new Date(originalCreatedAt),
  );
  TestValidator.equals(
    "member ownership preserved",
    updatedTodo.member.id,
    member.id,
  );
  TestValidator.equals("todo id preserved", updatedTodo.id, originalTodo.id);
}
