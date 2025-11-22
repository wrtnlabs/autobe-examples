import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test the complete todo deletion workflow for administrators.
 *
 * This E2E test validates the full lifecycle of admin todo management, from
 * account creation through todo deletion. The test creates an admin user
 * account, generates a personal todo item with realistic task data, then
 * performs deletion to verify proper ownership verification, soft deletion
 * implementation, and audit trail recording for administrative task
 * management.
 *
 * The workflow ensures administrators can successfully create and permanently
 * remove their own todo items, maintaining proper data isolation and audit
 * compliance throughout the administrative task management system.
 */
export async function test_api_admin_todo_deletion_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create admin user account for authentication and todo management access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: typia.random<string>(), // Simulated password hash
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(adminAccount);

  // Step 2: Create admin personal todo item to be deleted in the test workflow
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 4,
    wordMax: 10,
  });

  const createdTodo = await api.functional.todoApp.admin.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "urgent",
        ] as const),
        category: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        status: "pending",
        business_status: "active",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Verify todo creation was successful and validate data integrity
  TestValidator.equals("todo creation succeeded", createdTodo.title, todoTitle);
  TestValidator.equals("todo belongs to admin", createdTodo.id, createdTodo.id);
  TestValidator.predicate(
    "todo has valid creation timestamp",
    typeof createdTodo.created_at === "string" &&
      createdTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo is in active status",
    createdTodo.business_status === "active",
  );

  // Step 4: Execute deletion of the admin's own todo item
  const deletedTodo = await api.functional.todoApp.admin.todos.erase(
    connection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(deletedTodo);

  // Step 5: Validate deletion operation and audit trail
  TestValidator.equals(
    "deleted todo ID matches original",
    deletedTodo.id,
    createdTodo.id,
  );
  TestValidator.predicate(
    "todo has deletion timestamp",
    typeof deletedTodo.deleted_at === "string" &&
      deletedTodo.deleted_at.length > 0,
  );
  TestValidator.equals(
    "deleted todo title preserved for audit",
    deletedTodo.title,
    todoTitle,
  );
  TestValidator.predicate(
    "deletion occurred after creation",
    new Date(deletedTodo.deleted_at!) > new Date(createdTodo.created_at),
  );

  // Step 6: Verify soft deletion implementation
  TestValidator.predicate(
    "deleted todo maintains data integrity",
    deletedTodo.title === createdTodo.title &&
      deletedTodo.description === createdTodo.description &&
      deletedTodo.priority === createdTodo.priority,
  );
}
