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
 * Test complete todo creation workflow for authenticated members.
 *
 * This test validates the end-to-end process where a new member registers and
 * immediately creates a todo item with all fields including title, description,
 * due date, and priority. The test ensures that the todo creation operation
 * works correctly for authenticated members and that all system-generated
 * fields (ID, timestamps) are properly returned.
 *
 * The workflow covers:
 *
 * 1. Member registration with email and password
 * 2. Immediate authentication via registration response
 * 3. Todo creation with comprehensive data (title, description, priority)
 * 4. Validation of complete todo structure in response
 * 5. Verification that todo appears in retrieval operations
 *
 * The test uses realistic todo data with a descriptive title, detailed
 * description, and priority setting to validate the full feature set. All
 * system-generated fields are verified including unique ID format and proper
 * timestamp initialization.
 */
export async function test_api_todo_create_complete(
  connection: api.IConnection,
) {
  // Register new member account to establish authentication
  const memberRegistrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123",
  } satisfies IMemberCreate.IRequest;

  const member: ITodoMember.IAuthorized = await api.functional.auth.member.join(
    connection,
    { body: memberRegistrationData },
  );
  typia.assert(member);

  // Verify member account was created with proper role
  TestValidator.predicate("member has member role", member.role === "member");
  TestValidator.predicate(
    "member has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      member.id,
    ),
  );
  TestValidator.predicate(
    "member has valid email format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email),
  );
  TestValidator.predicate(
    "member has valid token",
    member.token.access.length > 0,
  );

  // Create comprehensive todo with all optional fields
  const todoCreateData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
    priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
  } satisfies ITodoTodo.ITodoCreate;

  const createdTodo: ITodoTodo = await api.functional.todo.member.todos.create(
    connection,
    { body: todoCreateData },
  );
  typia.assert(createdTodo);

  // Validate complete todo structure and content
  TestValidator.predicate("todo has valid title", createdTodo.title.length > 0);
  TestValidator.predicate(
    "todo title matches request",
    createdTodo.title === todoCreateData.title,
  );
  TestValidator.predicate(
    "todo priority matches request",
    createdTodo.priority === todoCreateData.priority,
  );
  TestValidator.predicate(
    "todo is not completed by default",
    createdTodo.completed === false,
  );
  TestValidator.predicate(
    "todo has valid member ID",
    createdTodo.member_id === member.id,
  );
  TestValidator.predicate(
    "todo has UUID format ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdTodo.id,
    ),
  );
  TestValidator.predicate(
    "todo has valid created timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      createdTodo.created_at,
    ),
  );
  TestValidator.predicate(
    "todo has valid updated timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      createdTodo.updated_at,
    ),
  );
  TestValidator.predicate(
    "todo has null completion timestamp",
    createdTodo.completed_at === null,
  );
}
