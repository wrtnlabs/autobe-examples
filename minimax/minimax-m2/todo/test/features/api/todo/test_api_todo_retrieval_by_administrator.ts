import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test successful todo retrieval by authenticated administrator user.
 *
 * This E2E test validates the complete administrative workflow for todo
 * management in the TodoApp system. The test follows a realistic business
 * scenario where an administrator authenticates, creates a personal
 * administrative todo item, then retrieves specific todo by ID to validate
 * comprehensive todo data display. Validates proper access control for
 * administrative users managing their own todo items.
 *
 * 1. Administrator authenticates through admin join endpoint
 * 2. Creates personal administrative todo item with realistic data
 * 3. Retrieves specific todo by ID to validate data display
 * 4. Validates access control and data integrity
 */
export async function test_api_todo_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminSecure123!";

  const administrator: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "System",
        last_name: "Administrator",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create personal administrative todo item
  const todoTitle: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription: string = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 7,
  });
  const todoCategory: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  });
  const dueDate: string = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: "pending",
        business_status: "active",
        priority: "medium",
        category: todoCategory,
        due_date: dueDate,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve the specific todo by ID
  const retrievedTodo: ITodoAppTodo = await api.functional.todoApp.todos.at(
    connection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);

  // Step 4: Validate todo retrieval and data integrity
  TestValidator.equals(
    "retrieved todo ID matches created todo",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo title matches",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description matches",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo status matches",
    retrievedTodo.status,
    createdTodo.status,
  );
  TestValidator.equals(
    "todo business status matches",
    retrievedTodo.business_status,
    createdTodo.business_status,
  );
  TestValidator.equals(
    "todo priority matches",
    retrievedTodo.priority,
    createdTodo.priority,
  );
  TestValidator.equals(
    "todo category matches",
    retrievedTodo.category,
    createdTodo.category,
  );
  TestValidator.equals(
    "todo due date matches",
    retrievedTodo.due_date,
    createdTodo.due_date,
  );

  // Validate that todos are not marked as deleted
  TestValidator.predicate(
    "todo is not deleted",
    retrievedTodo.deleted_at === null || retrievedTodo.deleted_at === undefined,
  );

  // Validate timestamps are present and reasonable
  TestValidator.predicate(
    "created timestamp exists",
    retrievedTodo.created_at !== null && retrievedTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    retrievedTodo.updated_at !== null && retrievedTodo.updated_at !== undefined,
  );
}
