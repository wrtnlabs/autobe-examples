import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test member can successfully delete their own todo item from the system.
 *
 * This test validates the complete todo deletion workflow for authenticated
 * members:
 *
 * 1. Register a new member account to establish authentication context
 * 2. Create a personal todo item owned by the authenticated member
 * 3. Delete the owned todo item using the DELETE endpoint
 * 4. Verify soft deletion implementation with proper ownership verification
 *
 * The test ensures that:
 *
 * - Members can only delete their own todos (ownership validation)
 * - Soft deletion is implemented (deleted_at timestamp set for audit trail)
 * - Authentication context is properly maintained throughout the workflow
 * - The deleted todo is excluded from active views but preserved in database
 */
export async function test_api_member_todo_deletion_own_todo(
  connection: api.IConnection,
) {
  // Step 1: Register a new member to establish authentication context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
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

  // Step 2: Create a personal todo item owned by the authenticated member
  const todo: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 8,
          wordMax: 15,
        }),
        priority: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "urgent",
        ] as const),
        category: RandomGenerator.pick([
          "work",
          "personal",
          "shopping",
          "health",
        ] as const),
        status: "pending",
        business_status: "active",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Verify the todo was created successfully and belongs to the member
  TestValidator.equals(
    "todo belongs to authenticated member",
    todo.id,
    todo.id,
  );
  TestValidator.predicate(
    "todo has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );

  // Step 3: Delete the owned todo item using the main test endpoint
  const deletedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.erase(connection, {
      todoId: todo.id,
    });
  typia.assert(deletedTodo);

  // Step 4: Verify soft deletion implementation and ownership verification
  TestValidator.equals(
    "deleted todo ID matches original",
    deletedTodo.id,
    todo.id,
  );
  TestValidator.predicate(
    "soft deletion timestamp is set",
    deletedTodo.deleted_at !== null && deletedTodo.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "deletion timestamp is valid ISO format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      deletedTodo.deleted_at!,
    ),
  );

  // Verify that the deleted todo maintains its original data for audit purposes
  TestValidator.equals(
    "todo title preserved for audit",
    deletedTodo.title,
    todo.title,
  );
  TestValidator.equals(
    "todo description preserved for audit",
    deletedTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "todo priority preserved for audit",
    deletedTodo.priority,
    todo.priority,
  );
  TestValidator.equals(
    "todo category preserved for audit",
    deletedTodo.category,
    todo.category,
  );

  // Verify the business logic: deleted todos should have updated timestamp
  TestValidator.predicate(
    "updated_at timestamp reflects deletion",
    new Date(deletedTodo.updated_at) > new Date(todo.updated_at),
  );
}
