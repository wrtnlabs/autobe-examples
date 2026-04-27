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
 * Test updating multiple editable fields of a todo item in a single request.
 *
 * Validates that a member can update the title, description, start date, and due date of an existing todo via a single PUT request. Ensures the response returns the full updated todo object with all four fields correctly reflecting the new input values. Also validates that the updated_at timestamp advances beyond created_at, while deleted_at and completed_at remain null.
 *
 * 1. Register a new member via authorize_member_join.
 * 2. Create a todo with only a title via generate_random_todo_app_member_todos_create.
 * 3. Update the todo with new values for all four editable fields via PUT /todoApp/member/todos/{todoId}.
 * 4. Validate the response structure with typia.assert.
 * 5. Verify all four provided fields match the update input exactly.
 * 6. Verify updated_at is more recent than created_at.
 * 7. Verify deleted_at and completed_at remain unchanged (null).
 */
export async function test_api_todo_update_multiple_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo with only a title (no description, no dates)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Prepare new values for all four editable fields
  const newTitle: string = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription: string = RandomGenerator.paragraph({ sentences: 3 });
  const newStartDate: string = new Date(
    Date.now() + randint(1, 30) * 24 * 60 * 60 * 1000,
  ).toISOString();
  const newDueDate: string = new Date(
    new Date(newStartDate).getTime() + randint(1, 30) * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 4. Update the todo with all four fields
  const updated = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
        description: newDescription,
        start_date: newStartDate,
        due_date: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Verify all four provided fields reflect the new values
  TestValidator.equals("title", updated.title, newTitle);
  TestValidator.equals("description", updated.description, newDescription);
  TestValidator.equals("start_date", updated.start_date, newStartDate);
  TestValidator.equals("due_date", updated.due_date, newDueDate);
  // 6. Verify updated_at is more recent than created_at
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(updated.updated_at).getTime() >
      new Date(updated.created_at).getTime(),
  );
  // 7. Verify deleted_at and completed_at remain unchanged (null)
  TestValidator.equals("deleted_at is null", updated.deleted_at, null);
  TestValidator.equals("completed_at is null", updated.completed_at, null);
}
