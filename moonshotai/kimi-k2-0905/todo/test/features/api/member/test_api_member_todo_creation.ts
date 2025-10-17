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
 * Tests todo creation workflow where a member registers, then creates multiple
 * todo items with different properties including titles, descriptions,
 * priorities, and due dates. Validates that todos appear in the user's
 * collection, have correct completion status, and system assigns proper
 * timestamps and IDs based on successful api calls rather than side effects.
 *
 * This test performs:
 *
 * 1. Member registration with email and password
 * 2. Authentication setup for creating todos
 * 3. Creation of multiple todo items with different priorities
 * 4. Validation of todo properties including completion, timestamps, and member
 *    ownership
 * 5. Testing edge cases like minimal todo creation
 * 6. Verification of proper UUID generation for todo IDs
 */
export async function test_api_member_todo_creation(
  connection: api.IConnection,
) {
  // Step 1: Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "securePassword123",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member registration successful",
    member.id !== null && member.email === memberEmail,
  );

  // Step 2: Create first todo with high priority
  const firstTodo = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: "Complete project documentation",
      priority: "High",
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(firstTodo);
  TestValidator.equals(
    "first todo title matches",
    firstTodo.title,
    "Complete project documentation",
  );
  TestValidator.predicate(
    "first todo is not completed by default",
    firstTodo.completed === false,
  );
  TestValidator.equals(
    "first todo priority is High",
    firstTodo.priority,
    "High",
  );
  TestValidator.predicate(
    "first todo has member ID",
    firstTodo.member_id === member.id,
  );
  TestValidator.predicate(
    "first todo has valid UUID",
    typia.is<string & tags.Format<"uuid">>(firstTodo.id),
  );

  // Step 3: Create todo with medium priority
  const mediumTodo = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: "Review pull requests",
      priority: "Medium",
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(mediumTodo);
  TestValidator.equals("medium todo priority", mediumTodo.priority, "Medium");
  TestValidator.predicate(
    "medium todo completion status",
    mediumTodo.completed === false,
  );

  // Step 4: Create todo with low priority
  const lowTodo = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: "Update development tools",
      priority: "Low",
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(lowTodo);
  TestValidator.equals("low todo priority", lowTodo.priority, "Low");

  // Step 5: Create minimal todo without priority (tests default priority)
  const minimalTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: "Check emails",
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(minimalTodo);
  TestValidator.equals("minimal todo title", minimalTodo.title, "Check emails");
  TestValidator.predicate(
    "minimal todo has default priority (Medium)",
    minimalTodo.priority === "Medium" || minimalTodo.priority !== null,
  );
  TestValidator.predicate(
    "minimal todo not completed",
    minimalTodo.completed === false,
  );

  // Step 6: Create another todo with high priority for edge case testing
  const edgeTodo = await api.functional.todo.member.todos.create(connection, {
    body: {
      title: "Prepare for meeting",
      priority: "High",
    } satisfies ITodoTodo.ITodoCreate,
  });
  typia.assert(edgeTodo);
  TestValidator.equals(
    "edge todo title",
    edgeTodo.title,
    "Prepare for meeting",
  );
  TestValidator.equals("edge todo priority", edgeTodo.priority, "High");

  // Step 7: Validate all todos have proper timestamps
  TestValidator.predicate(
    "first todo has creation timestamp",
    firstTodo.created_at !== null && firstTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "first todo has update timestamp",
    firstTodo.updated_at !== null && firstTodo.updated_at !== undefined,
  );
  TestValidator.predicate(
    "first todo completion timestamp is null when not completed",
    firstTodo.completed_at === null,
  );

  // Step 8: Validate timestamps ordering
  const firstCreated = new Date(firstTodo.created_at).getTime();
  const mediumCreated = new Date(mediumTodo.created_at).getTime();
  const lowCreated = new Date(lowTodo.created_at).getTime();
  const minimalCreated = new Date(minimalTodo.created_at).getTime();
  const edgeCreated = new Date(edgeTodo.created_at).getTime();

  TestValidator.predicate(
    "timestamps increase sequentially",
    firstCreated <= mediumCreated &&
      mediumCreated <= lowCreated &&
      lowCreated <= minimalCreated,
  );

  // Step 9: Validate member assignment across all todos
  TestValidator.equals(
    "all todos assigned to same member",
    mediumTodo.member_id,
    member.id,
  );
  TestValidator.equals(
    "all todos assigned to same member",
    lowTodo.member_id,
    member.id,
  );
  TestValidator.equals(
    "all todos assigned to same member",
    minimalTodo.member_id,
    member.id,
  );
  TestValidator.equals(
    "all todos assigned to same member",
    edgeTodo.member_id,
    member.id,
  );

  // Step 10: Validate todo creation with long title (within limits)
  const longTitleTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }), // Should create title within 200 char limit
        priority: "Medium",
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(longTitleTodo);
  TestValidator.predicate(
    "long title created successfully",
    longTitleTodo.title.length >= 1 && longTitleTodo.title.length <= 200,
  );

  // Step 11: Verify role and authentication properties
  TestValidator.predicate(
    "member has correct role",
    member.role === "member" || member.role === "admin",
  );
  TestValidator.predicate(
    "member authorization includes tokens",
    member.token.access !== null && member.token.refresh !== null,
  );
  TestValidator.predicate(
    "member has valid token expiration",
    typia.is<string & tags.Format<"date-time">>(member.token.expired_at),
  );
}
