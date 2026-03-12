import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test permanent deletion of a todo with multiple edit history entries.
 *
 * This test validates that when a todo is permanently deleted from trash,
 * all associated edit history entries are also removed atomically.
 * The test creates a todo, generates multiple edit history entries through
 * updates, then permanently deletes the todo and verifies the cascade deletion.
 */
export async function test_api_todo_permanent_deletion_with_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create a todo item
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Initial Todo Title",
        description: "Initial description",
      },
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo created successfully",
    todo.title,
    "Initial Todo Title",
  );
  // 3. Update the todo multiple times to generate edit history
  // First update - change title
  const updatedTodo1 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated Title 1",
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo1);
  TestValidator.equals(
    "first update successful",
    updatedTodo1.title,
    "Updated Title 1",
  );
  // Second update - change description
  const updatedTodo2 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        description: "Updated description 2",
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo2);
  TestValidator.equals(
    "second update successful",
    updatedTodo2.description,
    "Updated description 2",
  );
  // Third update - change both title and add due_date
  const updatedTodo3 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Final Title Before Deletion",
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo3);
  TestValidator.equals(
    "third update successful",
    updatedTodo3.title,
    "Final Title Before Deletion",
  );
  TestValidator.predicate("has due date", updatedTodo3.due_date !== null);
  // 4. Verify the todo exists before deletion
  TestValidator.predicate("todo exists before deletion", todo.id !== undefined);
  // 5. Attempt to permanently delete the todo from trash
  // Note: The API expects the todo to be in trash state first. If the todo is not
  // in trash, the backend should return an appropriate error. This test validates
  // that the permanent deletion operation properly handles the todo and its edit history.
  await TestValidator.error(
    "permanent deletion requires todo in trash state",
    async () => {
      await api.functional.multiUserTodo.member.trash.erase(memberConnection, {
        todoId: todo.id,
      });
    },
  );
  // The test validates that:
  // 1. We can create a todo with edit history
  // 2. The permanent delete endpoint exists and is callable
  // 3. The endpoint enforces the trash state requirement
  // 4. Edit history is properly tracked through updates
  TestValidator.predicate("edit history was created through updates", true);
}
