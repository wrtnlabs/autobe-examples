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
 * Test that updating a todo automatically creates an edit history entry.
 *
 * Validates that when a member updates their todo, the system correctly records the modification by updating the updated_at timestamp. This ensures the edit history mechanism is functioning properly for audit trail purposes.
 *
 * The test verifies that the updated todo reflects the new values and that the timestamp has changed, indicating the edit was processed and recorded by the backend.
 *
 * 1. Register a new member account with email and password
 * 2. Create a todo with a title
 * 3. Store the original updated_at timestamp
 * 4. Update the todo with a new title and description
 * 5. Verify the updated todo has a new updated_at timestamp
 * 6. Verify the updated todo contains the new title and description values
 */
export async function test_api_todo_update_creates_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a todo
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Store original updated_at timestamp
  const originalUpdatedAt: string = todo.updated_at;
  // 4. Prepare update body
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITodoAppTodo.IUpdate;
  // 5. Update the todo with new title and description
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(memberConnection, {
      todoId: todo.id,
      body: updateBody,
    });
  typia.assert(updatedTodo);
  // 6. Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at timestamp changed after edit",
    originalUpdatedAt,
    updatedTodo.updated_at,
  );
  // 7. Verify the updated values are present
  TestValidator.equals(
    "title matches updated value",
    updatedTodo.title,
    updateBody.title,
  );
  TestValidator.equals(
    "description matches updated value",
    updatedTodo.description,
    updateBody.description,
  );
}
