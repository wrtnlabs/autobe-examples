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
 * Test successful update of a todo item's full fields.
 *
 * This test covers the complete CRUD update functionality by:
 *
 * 1. Creating a member user for authentication
 * 2. Creating an initial todo item with basic properties
 * 3. Updating all possible fields including title, completion status, and priority
 * 4. Validating that all updates are properly reflected in the response
 * 5. Verifying timestamp management for completion status changes
 * 6. Testing individual field updates
 * 7. Confirming automatic updated_at timestamp updates
 *
 * The test validates the complete update lifecycle and ensures the API properly
 * handles all field modifications while maintaining data integrity, focusing
 * only on the available fields: title, completed, and priority.
 */
export async function test_api_todo_update_full_fields(
  connection: api.IConnection,
) {
  // Step 1: Register a new member user for authentication
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const member: ITodoMember.IAuthorized = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: memberEmail,
        password: "securepassword123",
      } satisfies IMemberCreate.IRequest,
    },
  );
  typia.assert(member);
  TestValidator.equals("member role", member.role, "member");

  // Step 2: Create initial todo item with basic properties
  const originalTodoTitle = "Original Todo Task";
  const originalTodo = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: originalTodoTitle,
        priority: "Low",
      } satisfies ITodoTodo.ITodoCreate,
    },
  );
  typia.assert(originalTodo);

  TestValidator.equals("todo member_id", originalTodo.member_id, member.id);
  TestValidator.equals("todo title", originalTodo.title, originalTodoTitle);
  TestValidator.equals("todo completed", originalTodo.completed, false);
  TestValidator.equals("todo priority", originalTodo.priority, "Low");
  TestValidator.predicate(
    "todo completed_at is null",
    originalTodo.completed_at === null,
  );

  // Step 3: Update todo with multiple fields at once
  const updatedTitle = "Updated Todo Task with New Description";
  const updatedTodo = await api.functional.todo.member.todos.update(
    connection,
    {
      todoId: originalTodo.id,
      body: {
        title: updatedTitle,
        completed: true,
        priority: "High",
      } satisfies ITodoTodo.ITodoUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Validate all fields were updated correctly
  TestValidator.equals("updated todo id", updatedTodo.id, originalTodo.id);
  TestValidator.equals(
    "updated todo member_id",
    updatedTodo.member_id,
    originalTodo.member_id,
  );
  TestValidator.equals("updated todo title", updatedTodo.title, updatedTitle);
  TestValidator.equals("updated todo completed", updatedTodo.completed, true);
  TestValidator.equals("updated todo priority", updatedTodo.priority, "High");
  TestValidator.equals(
    "updated todo created_at",
    updatedTodo.created_at,
    originalTodo.created_at,
  );

  TestValidator.predicate(
    "updated todo completed_at is set",
    updatedTodo.completed_at !== null && updatedTodo.completed_at !== undefined,
  );

  // Verify updated timestamp changed
  TestValidator.notEquals(
    "updated todo updated_at changed",
    updatedTodo.updated_at,
    originalTodo.updated_at,
  );

  // Step 5: Test individual field updates

  // Update only title
  const titleOnlyTodo = await api.functional.todo.member.todos.update(
    connection,
    {
      todoId: originalTodo.id,
      body: {
        title: "Title-only update",
      } satisfies ITodoTodo.ITodoUpdate,
    },
  );
  typia.assert(titleOnlyTodo);

  TestValidator.equals(
    "title-only todo title",
    titleOnlyTodo.title,
    "Title-only update",
  );
  TestValidator.equals(
    "title-only todo completed unchanged",
    titleOnlyTodo.completed,
    true,
  );
  TestValidator.equals(
    "title-only todo priority unchanged",
    titleOnlyTodo.priority,
    "High",
  );

  // Update only completion status
  const completionOnlyTodo = await api.functional.todo.member.todos.update(
    connection,
    {
      todoId: originalTodo.id,
      body: {
        completed: false,
      } satisfies ITodoTodo.ITodoUpdate,
    },
  );
  typia.assert(completionOnlyTodo);

  TestValidator.equals(
    "completion-only todo completed",
    completionOnlyTodo.completed,
    false,
  );
  TestValidator.equals(
    "completion-only todo title unchanged",
    completionOnlyTodo.title,
    "Title-only update",
  );
  TestValidator.equals(
    "completion-only todo completed_at cleared",
    completionOnlyTodo.completed_at,
    null,
  );

  // Update only priority
  const priorityOnlyTodo = await api.functional.todo.member.todos.update(
    connection,
    {
      todoId: originalTodo.id,
      body: {
        priority: "Medium",
      } satisfies ITodoTodo.ITodoUpdate,
    },
  );
  typia.assert(priorityOnlyTodo);

  TestValidator.equals(
    "priority-only todo priority",
    priorityOnlyTodo.priority,
    "Medium",
  );
  TestValidator.equals(
    "priority-only todo title unchanged",
    priorityOnlyTodo.title,
    "Title-only update",
  );
  TestValidator.equals(
    "priority-only todo completed unchanged",
    priorityOnlyTodo.completed,
    false,
  );

  // Step 6: Final validation - test all fields changed together again
  const finalTodo = await api.functional.todo.member.todos.update(connection, {
    todoId: originalTodo.id,
    body: {
      title: "Final todo task",
      completed: true,
      priority: "Low",
    } satisfies ITodoTodo.ITodoUpdate,
  });
  typia.assert(finalTodo);

  TestValidator.equals("final todo title", finalTodo.title, "Final todo task");
  TestValidator.equals("final todo completed", finalTodo.completed, true);
  TestValidator.equals("final todo priority", finalTodo.priority, "Low");
  TestValidator.predicate(
    "final todo completed_at is set",
    finalTodo.completed_at !== null,
  );
  TestValidator.notEquals(
    "final todo updated_at changed",
    finalTodo.updated_at,
    priorityOnlyTodo.updated_at,
  );
}
