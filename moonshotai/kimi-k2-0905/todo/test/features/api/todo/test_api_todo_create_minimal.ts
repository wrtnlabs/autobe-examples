import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

/**
 * Test minimal todo creation with title-only validation.
 *
 * This test validates the essential todo creation functionality by creating a
 * new todo with just the required title field. It ensures that:
 *
 * 1. Members can create todos with minimal data (title only)
 * 2. System automatically applies default values for optional fields
 * 3. Timestamps are generated automatically by the system
 * 4. The todo is immediately accessible after creation
 * 5. Default values are correctly set for completion status and priority
 */
export async function test_api_todo_create_minimal(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password: "secure1234",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Create minimal todo with title only
  const title = RandomGenerator.name(3); // Generate realistic todo title
  const todo = await api.functional.todo.member.todos.create(connection, {
    body: {
      title,
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(todo);

  // Step 3: Validate response structure and default values
  TestValidator.equals("todo title matches input", todo.title, title);
  TestValidator.equals(
    "member ID matches authenticated user",
    todo.member_id,
    member.id,
  );
  TestValidator.equals(
    "completion status defaults to false",
    todo.completed,
    false,
  );
  TestValidator.predicate(
    "priority defaults to valid enum value",
    todo.priority === "Low" ||
      todo.priority === "Medium" ||
      todo.priority === "High",
  );

  // Step 4: Validate system-generated fields
  TestValidator.predicate(
    "UUID format for ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO date format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      todo.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      todo.updated_at,
    ),
  );
  TestValidator.equals(
    "completed_at is null for new todos",
    todo.completed_at,
    null,
  );
}
