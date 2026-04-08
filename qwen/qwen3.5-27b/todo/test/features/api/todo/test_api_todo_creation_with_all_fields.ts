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
 * Test creating a todo item with all available fields including optional description, start date, and due date.
 *
 * Validates the complete todo creation workflow with a fully populated request body. Ensures that all optional fields (description, start_date, due_date) are properly stored and returned alongside the required title field. Verifies that newly created todos are marked as incomplete by default and that the member relationship is correctly established.
 *
 * Special attention is given to date-time field formatting (ISO 8601), default value assignment (completed: false, deleted_at: null), and the inclusion of system-managed timestamps (created_at, updated_at).
 *
 * 1. Authenticate a new member account using authorize_member_join utility.
 * 2. Create a todo with all fields: title, description, start_date, and due_date.
 * 3. Validate the response contains all submitted values with correct types.
 * 4. Verify default values: completed is false, deleted_at is null.
 * 5. Verify timestamps are present and properly formatted.
 */
export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Prepare todo creation data with all fields
  const now = new Date();
  const startDate = new Date(now.getTime() + 86400000); // tomorrow
  const dueDate = new Date(now.getTime() + 604800000); // 7 days from now
  const body = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    start_date: startDate.toISOString(),
    due_date: dueDate.toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  // 3. Create todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(todo);
  // 4. Validate all fields
  TestValidator.equals("title matches input", todo.title, body.title);
  TestValidator.equals(
    "description matches input",
    todo.description,
    body.description,
  );
  TestValidator.equals(
    "start_date matches input",
    todo.start_date,
    body.start_date,
  );
  TestValidator.equals("due_date matches input", todo.due_date, body.due_date);
  // 5. Verify default values
  TestValidator.equals("completed is false by default", todo.completed, false);
  TestValidator.equals(
    "deleted_at is null for active todo",
    todo.deleted_at,
    null,
  );
  // 6. Verify timestamps exist and are valid
  TestValidator.predicate("created_at is present", todo.created_at != null);
  TestValidator.predicate("updated_at is present", todo.updated_at != null);
  // 7. Verify member relationship
  TestValidator.predicate("member exists", todo.member != null);
  TestValidator.predicate("member has valid id", todo.member.id.length > 0);
  TestValidator.predicate(
    "member has valid email",
    todo.member.email.length > 0,
  );
}
