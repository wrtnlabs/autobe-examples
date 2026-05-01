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
 * Test toggling a todo from incomplete to complete.
 *
 * Validates the toggle endpoint correctly transitions a todo's completion status. A newly created todo defaults to incomplete with completed_at set to null. After calling the toggle endpoint, the todo must return with completed_at set to a non-null timestamp, confirming the transition from incomplete to complete.
 *
 * The test also verifies that only the completion status and updated_at timestamp change — all other fields (id, title, description, start_date, due_date, created_at) are preserved exactly as they were before the toggle.
 *
 * 1. Register and authenticate a new member via join.
 * 2. Create a todo with a title, which defaults to incomplete (completed_at: null).
 * 3. Verify the initial todo has completed_at: null.
 * 4. Call toggle endpoint with the todo's ID to mark it complete.
 * 5. Validate completed_at is now non-null.
 * 6. Confirm all other fields remain unchanged except updated_at.
 */
export async function test_api_todo_toggle_incomplete_to_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo that defaults to incomplete
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Verify initial state: todo is incomplete
  TestValidator.equals("initial completed_at is null", todo.completed_at, null);
  // 4. Toggle the todo from incomplete to complete
  const toggled = await api.functional.todoApp.member.todos.toggle(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(toggled);
  // 5. Verify completed_at is now set to a non-null timestamp
  TestValidator.predicate(
    "completed_at is non-null after toggle",
    toggled.completed_at !== null,
  );
  // 6. Confirm all other fields remain unchanged
  TestValidator.equals("id unchanged", toggled.id, todo.id);
  TestValidator.equals("title unchanged", toggled.title, todo.title);
  TestValidator.equals(
    "description unchanged",
    toggled.description,
    todo.description,
  );
  TestValidator.equals(
    "start_date unchanged",
    toggled.start_date,
    todo.start_date,
  );
  TestValidator.equals("due_date unchanged", toggled.due_date, todo.due_date);
  TestValidator.equals(
    "created_at unchanged",
    toggled.created_at,
    todo.created_at,
  );
  // 7. updated_at is refreshed after toggle
  TestValidator.notEquals(
    "updated_at refreshed",
    toggled.updated_at,
    todo.updated_at,
  );
}
