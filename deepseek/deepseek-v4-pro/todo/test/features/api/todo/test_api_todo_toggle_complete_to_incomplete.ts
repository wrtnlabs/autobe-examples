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
 * Test toggling a todo's completion status from complete back to incomplete.
 *
 * Validates that the toggle endpoint supports free re-toggling: after a todo has been marked complete, toggling again returns it to incomplete state. The test creates a todo (incomplete by default), toggles it to complete as a setup step, then toggles it again as the operation under test.
 *
 * Verifies that the second toggle correctly clears the completed_at timestamp back to null, the updated_at timestamp is refreshed to reflect the latest change, and all other todo fields remain intact throughout both toggle operations.
 *
 * 1. Member registers and authenticates.
 * 2. Member creates a new todo, which is incomplete by default.
 * 3. Member toggles the todo to mark it complete.
 * 4. Member toggles the same todo again to mark it incomplete.
 * 5. Validates completed_at is null, updated_at is refreshed, and other fields are preserved.
 */
export async function test_api_todo_toggle_complete_to_incomplete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new todo (incomplete by default)
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(created);
  TestValidator.equals("new todo is incomplete", created.completed_at, null);
  // 3. Toggle to complete
  const completed = await api.functional.todoApp.member.todos.toggle(
    memberConnection,
    {
      todoId: created.id,
    },
  );
  typia.assert(completed);
  TestValidator.predicate(
    "toggled todo is complete",
    completed.completed_at !== null,
  );
  TestValidator.predicate(
    "updated_at is refreshed after first toggle",
    completed.updated_at > created.updated_at,
  );
  // 4. Toggle back to incomplete (operation under test)
  const incomplete = await api.functional.todoApp.member.todos.toggle(
    memberConnection,
    {
      todoId: created.id,
    },
  );
  typia.assert(incomplete);
  // 5. Validate the result
  TestValidator.equals(
    "completed_at is null after re-toggle",
    incomplete.completed_at,
    null,
  );
  TestValidator.predicate(
    "updated_at is refreshed after second toggle",
    incomplete.updated_at > completed.updated_at,
  );
  TestValidator.equals("id remains unchanged", incomplete.id, created.id);
  TestValidator.equals(
    "title remains unchanged",
    incomplete.title,
    created.title,
  );
  TestValidator.equals(
    "description remains unchanged",
    incomplete.description,
    created.description,
  );
  TestValidator.equals(
    "start_date remains unchanged",
    incomplete.start_date,
    created.start_date,
  );
  TestValidator.equals(
    "due_date remains unchanged",
    incomplete.due_date,
    created.due_date,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    incomplete.created_at,
    created.created_at,
  );
}
