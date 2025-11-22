import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test todo status workflow transitions by member user.
 *
 * This comprehensive test validates the complete todo lifecycle management by:
 *
 * 1. Member user authentication and registration
 * 2. Todo item creation with default pending status
 * 3. Sequential status progression: pending → in_progress → completed
 * 4. Automatic completed_at timestamp management during status changes
 * 5. Reverse transition: completed → pending with proper timestamp handling
 * 6. Verification of business logic and data integrity throughout the workflow
 *
 * The test ensures that the TodoApp system properly manages todo status
 * transitions while maintaining accurate timestamp tracking and business rule
 * enforcement.
 */
export async function test_api_todo_status_workflow_update(
  connection: api.IConnection,
) {
  // Step 1: Member Registration and Authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create Todo Item
  const todo: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "pending",
        priority: "medium",
        category: "test-workflow",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Validate initial state
  TestValidator.equals(
    "initial todo status should be pending",
    todo.status,
    "pending",
  );
  TestValidator.predicate(
    "initial completed_at should be null",
    todo.completed_at === null,
  );

  // Step 3: Status Transition 1 - pending → in_progress
  const inProgressTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(connection, {
      todoId: todo.id,
      body: {
        status: "in_progress",
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(inProgressTodo);

  // Validate first transition
  TestValidator.equals(
    "status should be in_progress",
    inProgressTodo.status,
    "in_progress",
  );
  TestValidator.predicate(
    "completed_at should remain null",
    inProgressTodo.completed_at === null,
  );
  TestValidator.predicate(
    "updated_at should change",
    inProgressTodo.updated_at !== todo.updated_at,
  );

  // Step 4: Status Transition 2 - in_progress → completed
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(connection, {
      todoId: inProgressTodo.id,
      body: {
        status: "completed",
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(completedTodo);

  // Validate completion with automatic timestamp
  TestValidator.equals(
    "status should be completed",
    completedTodo.status,
    "completed",
  );
  TestValidator.predicate(
    "completed_at should be set automatically",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should change",
    completedTodo.updated_at !== inProgressTodo.updated_at,
  );

  // Validate timestamp format
  TestValidator.predicate(
    "completed_at should be valid ISO format",
    typeof completedTodo.completed_at === "string" &&
      completedTodo.completed_at.includes("T") &&
      completedTodo.completed_at.includes("Z"),
  );

  // Step 5: Status Transition 3 - completed → pending (reverse workflow)
  const revertedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(connection, {
      todoId: completedTodo.id,
      body: {
        status: "pending",
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(revertedTodo);

  // Validate reverse transition with timestamp management
  TestValidator.equals(
    "status should be reverted to pending",
    revertedTodo.status,
    "pending",
  );
  TestValidator.predicate(
    "completed_at should be cleared on reversion",
    revertedTodo.completed_at === null,
  );
  TestValidator.predicate(
    "updated_at should change again",
    revertedTodo.updated_at !== completedTodo.updated_at,
  );

  // Final validation: Ensure todo ownership is maintained
  TestValidator.equals(
    "todo should maintain same ID",
    revertedTodo.id,
    todo.id,
  );
  TestValidator.equals(
    "todo should maintain same title",
    revertedTodo.title,
    todo.title,
  );
  TestValidator.equals(
    "todo should maintain same priority",
    revertedTodo.priority,
    todo.priority,
  );
  TestValidator.equals(
    "todo should maintain same category",
    revertedTodo.category,
    todo.category,
  );

  // Business logic validation: Verify workflow integrity
  TestValidator.predicate(
    "should have undergone 3 status changes",
    todo.status === "pending" &&
      inProgressTodo.status === "in_progress" &&
      completedTodo.status === "completed" &&
      revertedTodo.status === "pending",
  );
}
