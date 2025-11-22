import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_creation_by_admin_with_all_fields(
  connection: api.IConnection,
) {
  // Step 1: Create new administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate comprehensive todo data with all available fields
  const todoTitle: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });
  const todoDescription: string = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const todoCategory: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 1,
    wordMax: 3,
  });
  const futureDueDate: string = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
  ).toISOString();

  // Step 3: Create todo item with comprehensive task information
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: "urgent",
        category: todoCategory,
        due_date: futureDueDate,
        status: "pending",
        business_status: "active",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 4: Validate todo creation success and data integrity
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo description matches input",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo priority is urgent",
    createdTodo.priority,
    "urgent",
  );
  TestValidator.equals(
    "todo category matches input",
    createdTodo.category,
    todoCategory,
  );
  TestValidator.equals(
    "todo due date matches input",
    createdTodo.due_date,
    futureDueDate,
  );

  // Step 5: Verify default status handling
  TestValidator.equals(
    "todo status defaults to pending",
    createdTodo.status,
    "pending",
  );
  TestValidator.equals(
    "todo business status defaults to active",
    createdTodo.business_status,
    "active",
  );

  // Step 6: Validate timestamp assignment
  TestValidator.predicate(
    "created timestamp is set",
    createdTodo.created_at !== null && createdTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated timestamp is set",
    createdTodo.updated_at !== null && createdTodo.updated_at !== undefined,
  );

  // Step 7: Ensure todo is accessible and data persists
  TestValidator.predicate(
    "todo ID is generated",
    createdTodo.id !== null && createdTodo.id !== undefined,
  );
  TestValidator.predicate(
    "todo is not marked as deleted",
    createdTodo.deleted_at === null || createdTodo.deleted_at === undefined,
  );
}
