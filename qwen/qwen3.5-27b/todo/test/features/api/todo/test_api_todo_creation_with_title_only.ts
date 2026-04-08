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
 * Test todo creation with minimal required data (title only).
 *
 * Validates the primary success path for creating a todo item with only the required title field. Verifies that optional fields are properly defaulted to null and that new todos are created as incomplete.
 *
 * Special attention is given to ensuring that the todo is correctly owned by the authenticated member and that all system-managed fields (timestamps, completion status) are properly initialized.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Create a todo with only the required title field (no description, start_date, or due_date).
 * 3. Validate the response contains all expected fields with correct default values.
 * 4. Verify the todo is owned by the authenticated member and is incomplete by default.
 */
export async function test_api_todo_creation_with_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo with only the required title field
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: title,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate todo fields
  TestValidator.equals("title matches input", todo.title, title);
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("start_date is null", todo.start_date, null);
  TestValidator.equals("due_date is null", todo.due_date, null);
  TestValidator.equals("completed is false", todo.completed, false);
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
  // 4. Validate member ownership
  TestValidator.equals(
    "owned by authenticated member",
    todo.member.id,
    member.id,
  );
  TestValidator.equals("member email matches", todo.member.email, member.email);
  // 5. Validate timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    () => !isNaN(Date.parse(todo.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    () => !isNaN(Date.parse(todo.updated_at)),
  );
  TestValidator.equals(
    "created_at equals updated_at for new todo",
    todo.created_at,
    todo.updated_at,
  );
}
