import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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
 * Test creating a new todo item with only the required title field.
 *
 * This test validates that:
 * 1. Member can create a todo with only the required title field
 * 2. The response returns a complete IMultiUserTodoTodo object
 * 3. Optional fields default to expected values (description = "", start_date = null, due_date = null)
 * 4. The todo is incomplete by default (completed = false)
 * 5. The todo has no edit history initially
 * 6. The todo is associated with the authenticated member
 */
export async function test_api_todo_creation_with_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member to obtain access token
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Create todo with only the required title field
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Quick reminder",
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  // Validate the complete response using typia.assert
  typia.assert(todo);
  // Validate business logic
  TestValidator.equals("id is valid UUID", todo.id.length > 0, true);
  TestValidator.equals("title matches input", todo.title, "Quick reminder");
  TestValidator.equals(
    "description defaults to empty string",
    todo.description,
    "",
  );
  TestValidator.equals("start_date is null", todo.start_date, null);
  TestValidator.equals("due_date is null", todo.due_date, null);
  TestValidator.equals("completed is false by default", todo.completed, false);
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
  TestValidator.equals(
    "member id matches authenticated member",
    todo.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email matches authenticated member",
    todo.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "editHistories is empty array",
    todo.editHistories.length,
    0,
  );
  TestValidator.equals("editHistories_count is 0", todo.editHistories_count, 0);
}
