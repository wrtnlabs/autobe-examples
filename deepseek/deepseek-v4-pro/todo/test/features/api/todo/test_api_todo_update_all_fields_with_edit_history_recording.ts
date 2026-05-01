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
 * Test updating all four editable fields on a todo and verify the update response.
 *
 * Validates that when all four editable fields (title, description, start_date,
 * due_date) of an existing todo are changed simultaneously, the update succeeds
 * and the response reflects all new values. The updated_at timestamp must be
 * newer than created_at to confirm the modification was persisted.
 *
 * The server records edit history entries internally for each changed field while
 * unchanged fields produce no entries. Direct verification of edit history entries
 * requires a dedicated history retrieval endpoint not available in the current SDK.
 *
 * 1. A new member authenticates via join.
 * 2. The member creates a todo with only a title — no description, no dates.
 * 3. All four fields are updated with new values distinct from the originals.
 * 4. Verify the updated todo reflects all four new values.
 * 5. Verify updated_at is newer than created_at and id remains unchanged.
 */
export async function test_api_todo_update_all_fields_with_edit_history_recording(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo with only a title — no description, no dates
  const initialTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        start_date: null,
        due_date: null,
      },
    },
  );
  typia.assert(initialTodo);
  // 3. Verify initial state
  TestValidator.predicate(
    "initial description should be null",
    initialTodo.description === null,
  );
  TestValidator.predicate(
    "initial start_date should be null",
    initialTodo.start_date === null,
  );
  TestValidator.predicate(
    "initial due_date should be null",
    initialTodo.due_date === null,
  );
  // 4. Prepare new values for all four fields
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const now = new Date();
  const newStartDate = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const newDueDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 5. Update all four fields
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: newTitle,
        description: newDescription,
        start_date: newStartDate,
        due_date: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 6. Verify the response
  TestValidator.equals(
    "id should remain unchanged",
    updatedTodo.id,
    initialTodo.id,
  );
  TestValidator.equals("title should be updated", updatedTodo.title, newTitle);
  TestValidator.equals(
    "description should be updated",
    updatedTodo.description,
    newDescription,
  );
  TestValidator.equals(
    "start_date should be updated",
    updatedTodo.start_date,
    newStartDate,
  );
  TestValidator.equals(
    "due_date should be updated",
    updatedTodo.due_date,
    newDueDate,
  );
  // 7. Verify updated_at is newer than created_at
  const createdAt = new Date(updatedTodo.created_at).getTime();
  const updatedAt = new Date(updatedTodo.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    updatedAt > createdAt,
  );
}
