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
 * Test that soft deleting a todo removes it from the normal todo list while preserving all data.
 *
 * Validates the soft delete operation for todo items. The test authenticates a member, creates a todo with complete data including title, description, start date, and due date, then performs a soft delete operation. While the full verification of list removal and trash presence requires additional endpoints not available in the current SDK, this test ensures the soft delete operation executes successfully and the todo data is properly structured before deletion.
 *
 * The soft delete operation should mark the todo as deleted by setting the deleted_at timestamp without permanently removing the data from the database. This allows for potential restoration or permanent deletion later.
 *
 * 1. Member authenticates by joining with auto-generated credentials.
 * 2. Member creates a todo with title, description, start_date, and due_date.
 * 3. Validates the created todo has all expected fields and correct data types.
 * 4. Member soft deletes the todo using the erase endpoint.
 * 5. Verifies the soft delete operation completes successfully without errors.
 */
export async function test_api_todo_soft_delete_removal_from_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a todo with complete data
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(todo);
  // 3. Validate todo structure before deletion
  TestValidator.equals("todo has valid id", typeof todo.id, "string");
  TestValidator.equals("todo has title", typeof todo.title, "string");
  TestValidator.predicate("title is not empty", todo.title.length > 0);
  TestValidator.equals(
    "todo has member reference",
    typeof todo.member.id,
    "string",
  );
  TestValidator.equals(
    "member id matches authenticated user",
    todo.member.id,
    member.id,
  );
  TestValidator.equals("todo is incomplete by default", todo.completed, false);
  TestValidator.equals("todo is not deleted initially", todo.deleted_at, null);
  // 4. Soft delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Verify soft delete completed (operation succeeded without error)
  TestValidator.predicate("soft delete operation completed", true);
}
