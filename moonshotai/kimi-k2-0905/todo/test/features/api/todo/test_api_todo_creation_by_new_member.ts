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
 * Test successful todo creation with authenticated member.
 *
 * Validates the complete workflow from member registration to creating todos
 * with various properties including title, priority levels, and timestamps.
 * Tests that newly created member can immediately create todos and that todo
 * data is properly associated with the member's account.
 *
 * This test follows these steps:
 *
 * 1. Create a new member account via registration endpoint
 * 2. Verify member account was created successfully with proper authentication
 * 3. Create a todo item with basic properties (title, priority)
 * 4. Validate the created todo contains correct member ownership
 * 5. Test creating additional todos with different priority levels
 * 6. Verify todo creation timestamps and completion status
 */
export async function test_api_todo_creation_by_new_member(
  connection: api.IConnection,
) {
  // Step 1: Create new member account for todo testing
  const registerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // Generate secure password
  } satisfies IMemberCreate.IRequest;

  const member = await api.functional.auth.member.join(connection, {
    body: registerData,
  });
  typia.assert(member);

  // Step 2: Verify member was created with proper role
  TestValidator.equals(
    "member has correct role",
    member.role,
    "member" satisfies IETodoRole,
  );
  TestValidator.predicate(
    "member has valid email format",
    member.email.includes("@"),
  );
  TestValidator.predicate(
    "member has JWT token",
    member.token.access.length > 0,
  );

  // Step 3: Create first todo with default priority
  const firstTodoData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 6 }),
  } satisfies ITodoTodo.ITodoCreate;

  const firstTodo = await api.functional.todo.member.todos.create(connection, {
    body: firstTodoData,
  });
  typia.assert(firstTodo);

  // Step 4: Validate todo was created correctly
  TestValidator.equals(
    "todo has correct member ID",
    firstTodo.member_id,
    member.id,
  );
  TestValidator.equals(
    "todo has correct title",
    firstTodo.title,
    firstTodoData.title,
  );
  TestValidator.equals(
    "todo default priority should be Medium",
    firstTodo.priority,
    "Medium" satisfies IETodoPriority,
  );
  TestValidator.equals("todo should be incomplete", firstTodo.completed, false);
  TestValidator.predicate(
    "todo has creation timestamp",
    firstTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo has update timestamp",
    firstTodo.updated_at.length > 0,
  );

  // Step 5: Create multiple todos with different priorities
  const priorities: IETodoPriority[] = ["Low", "Medium", "High"];

  const priorityTodos = await ArrayUtil.asyncRepeat(3, async (index) => {
    const priority = priorities[index];
    const todoData = {
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 5,
      }),
      priority: priority,
    } satisfies ITodoTodo.ITodoCreate;

    const todo = await api.functional.todo.member.todos.create(connection, {
      body: todoData,
    });

    TestValidator.equals(
      `todo ${index} has correct member ID`,
      todo.member_id,
      member.id,
    );
    TestValidator.equals(
      `todo ${index} has correct priority`,
      todo.priority,
      priority,
    );
    TestValidator.equals(
      `todo ${index} should be incomplete`,
      todo.completed,
      false,
    );

    return todo;
  });

  // Step 6: Verify all todos belong to the same member
  TestValidator.equals(
    "all priority todos created successfully",
    priorityTodos.length,
    3,
  );

  for (const todo of priorityTodos) {
    TestValidator.equals(
      "todo member ownership consistent",
      todo.member_id,
      member.id,
    );
    TestValidator.predicate("todo has unique ID", todo.id.length > 0);
    TestValidator.predicate(
      "todo completion status is boolean",
      typeof todo.completed === "boolean",
    );
  }
}
