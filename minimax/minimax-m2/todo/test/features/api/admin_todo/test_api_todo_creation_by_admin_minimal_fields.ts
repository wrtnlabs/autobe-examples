import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test minimal administrative todo creation workflow with only required title
 * field.
 *
 * This test validates the core functionality of creating todo items with
 * minimal data, ensuring that administrators can create personal todos using
 * just the mandatory title field while system defaults are properly applied for
 * status, priority, and business status.
 *
 * Business Workflow:
 *
 * 1. Create new administrator account through secure registration process
 * 2. Authenticate administrator to establish admin context for todo operations
 * 3. Create todo item using only required title field (no optional parameters)
 * 4. Validate that system defaults are correctly applied for all omitted fields
 * 5. Ensure todo is properly associated with the authenticated administrator
 *
 * Key Validation Points:
 *
 * - Admin account creation with proper authentication setup
 * - Minimal todo creation using only mandatory title field
 * - Default value application for status (pending), business_status (active),
 *   priority (medium)
 * - Proper administrator association and authorization validation
 * - System behavior with omitted optional fields in todo creation
 */
export async function test_api_todo_creation_by_admin_minimal_fields(
  connection: api.IConnection,
) {
  // Step 1: Create new administrator account for testing
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const administrator: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashed_password_123",
        role_level: "admin",
        status: "active",
        first_name: "Test",
        last_name: "Administrator",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create todo item with minimal required data (only title field)
  const todoTitle: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });

  const todo: ITodoAppTodo = await api.functional.todoApp.admin.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Step 3: Validate todo creation and default value application
  TestValidator.equals("todo title matches input", todo.title, todoTitle);
  TestValidator.equals(
    "todo has default pending status",
    todo.status,
    "pending",
  );
  TestValidator.equals(
    "todo has default active business status",
    todo.business_status,
    "active",
  );
  TestValidator.equals(
    "todo has default medium priority",
    todo.priority,
    "medium",
  );
  TestValidator.predicate(
    "todo has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );
  TestValidator.predicate(
    "todo has creation timestamp",
    todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo has update timestamp",
    todo.updated_at.length > 0,
  );
  TestValidator.equals("no description provided", todo.description, null);
  TestValidator.equals("no category provided", todo.category, null);
  TestValidator.equals("no due date provided", todo.due_date, null);
}
