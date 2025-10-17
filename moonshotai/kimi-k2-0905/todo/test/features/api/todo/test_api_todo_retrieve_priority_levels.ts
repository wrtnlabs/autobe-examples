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
 * Test todo retrieval across multiple priority levels.
 *
 * This test validates that members can retrieve detailed information for High,
 * Medium and Low priority todos. It verifies that different priority settings
 * are correctly stored and returned while maintaining ownership restrictions.
 * The test creates a member account, then creates multiple todos with different
 * priority levels (High, Medium, Low), and retrieves each one to confirm that
 * all priority configurations are properly stored and accessible. This ensures
 * the complete CRUD workflow from creation through detailed retrieval works
 * correctly for various priority configurations.
 */
export async function test_api_todo_retrieve_priority_levels(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Define priority levels to test
  const priorities: IETodoPriority[] = ["Low", "Medium", "High"];

  // Create todos with different priority levels
  const createdTodos: ITodoTodo[] = [];

  for (const priority of priorities) {
    const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
    const todo = await api.functional.todo.member.todos.create(connection, {
      body: {
        title: todoTitle,
        priority: priority,
      } satisfies ITodoTodo.ITodoCreate,
    });
    typia.assert(todo);

    // Verify the created todo has correct properties
    TestValidator.equals(
      "todo has correct member_id",
      todo.member_id,
      member.id,
    );
    TestValidator.equals("todo has correct title", todo.title, todoTitle);
    TestValidator.equals("todo has correct priority", todo.priority, priority);
    TestValidator.equals(
      "todo is not completed by default",
      todo.completed,
      false,
    );
    TestValidator.predicate("todo has valid UUID id", () =>
      typia.is<string & tags.Format<"uuid">>(todo.id),
    );
    TestValidator.predicate(
      "todo has valid timestamps",
      () =>
        typia.is<string & tags.Format<"date-time">>(todo.created_at) &&
        typia.is<string & tags.Format<"date-time">>(todo.updated_at),
    );

    createdTodos.push(todo);
  }

  // Test retrieval of each todo by priority level
  for (const createdTodo of createdTodos) {
    const retrievedTodo = await api.functional.todo.member.todos.at(
      connection,
      {
        todoId: createdTodo.id,
      },
    );
    typia.assert(retrievedTodo);

    // Verify retrieved todo matches the created todo
    TestValidator.equals(
      "retrieved todo id matches",
      retrievedTodo.id,
      createdTodo.id,
    );
    TestValidator.equals(
      "retrieved todo member_id matches",
      retrievedTodo.member_id,
      createdTodo.member_id,
    );
    TestValidator.equals(
      "retrieved todo title matches",
      retrievedTodo.title,
      createdTodo.title,
    );
    TestValidator.equals(
      "retrieved todo priority matches",
      retrievedTodo.priority,
      createdTodo.priority,
    );
    TestValidator.equals(
      "retrieved todo completed status matches",
      retrievedTodo.completed,
      createdTodo.completed,
    );
    TestValidator.equals(
      "retrieved todo created_at matches",
      retrievedTodo.created_at,
      createdTodo.created_at,
    );
    TestValidator.equals(
      "retrieved todo updated_at matches",
      retrievedTodo.updated_at,
      createdTodo.updated_at,
    );
    TestValidator.equals(
      "retrieved todo completed_at matches",
      retrievedTodo.completed_at,
      createdTodo.completed_at,
    );
  }

  // Test that priority levels are correctly distributed
  const retrievedPriorities = createdTodos.map((todo) => todo.priority);
  TestValidator.equals(
    "all priority levels created",
    retrievedPriorities.sort(),
    ["High", "Low", "Medium"],
  );

  // Test ownership restrictions - ensure todos belong to the correct member
  for (const todo of createdTodos) {
    TestValidator.equals(
      "todo belongs to test member",
      todo.member_id,
      member.id,
    );
    TestValidator.predicate("todo member_id is valid UUID", () =>
      typia.is<string & tags.Format<"uuid">>(todo.member_id),
    );
  }
}
