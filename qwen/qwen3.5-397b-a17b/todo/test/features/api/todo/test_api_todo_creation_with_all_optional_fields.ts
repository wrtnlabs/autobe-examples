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
 * Test todo creation with all optional fields provided.
 *
 * This test verifies that the todo creation endpoint correctly handles
 * all optional fields including description, start_date, and due_date.
 * It validates that the system stores all provided values accurately,
 * maintains independent relationships between start and due dates,
 * and initializes new todos with incomplete status (completed: false).
 *
 * Test flow:
 * 1. Register a new member account
 * 2. Create authenticated member connection
 * 3. Create todo with all optional fields populated
 * 4. Validate response structure and field values
 * 5. Verify default completed status is false
 * 6. Confirm dates are in ISO 8601 format with timezone
 */
export async function test_api_todo_creation_with_all_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and get authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create authenticated connection for todo operations
  const todoConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Prepare todo creation data with ALL optional fields
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next week
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    start_date: startDate.toISOString(),
    due_date: dueDate.toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  // 4. Create todo with all optional fields using utility function
  const todo = await generate_random_todo_app_member_todos_create(
    todoConnection,
    {
      body: todoInput,
    },
  );
  typia.assert(todo);
  // 5. Validate all fields match input
  TestValidator.equals("title matches", todo.title, todoInput.title);
  TestValidator.equals(
    "description matches",
    todo.description,
    todoInput.description,
  );
  TestValidator.equals(
    "start_date matches",
    todo.start_date,
    todoInput.start_date,
  );
  TestValidator.equals("due_date matches", todo.due_date, todoInput.due_date);
  // 6. Verify completed status is false by default
  TestValidator.predicate(
    "todo is incomplete by default",
    todo.completed === false,
  );
  // 7. Verify owner information is present
  TestValidator.equals("owner id matches", todo.member.id, memberAuth.id);
  TestValidator.equals(
    "owner display name matches",
    todo.member.display_name,
    memberAuth.display_name,
  );
  // 8. Verify soft delete field is null for active todo
  TestValidator.equals(
    "deleted_at is null for active todo",
    todo.deleted_at,
    null,
  );
  // 9. Verify start_date and due_date are independent (both can be set)
  TestValidator.predicate("start_date is set", todo.start_date !== null);
  TestValidator.predicate("due_date is set", todo.due_date !== null);
  TestValidator.predicate(
    "start_date is before due_date",
    new Date(todo.start_date!).getTime() < new Date(todo.due_date!).getTime(),
  );
}
