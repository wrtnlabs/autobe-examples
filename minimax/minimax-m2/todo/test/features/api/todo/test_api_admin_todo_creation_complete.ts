import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_todo_creation_complete(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminTest123!";

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Test",
        last_name: "Admin",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create todo item with comprehensive attributes
  const todo1: ITodoAppTodo = await api.functional.todoApp.admin.todos.create(
    connection,
    {
      body: {
        title: "Complete project documentation",
        description:
          "Write comprehensive API documentation including all endpoints, authentication methods, and usage examples",
        status: "pending",
        business_status: "active",
        priority: "high",
        category: "development",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);

  // Step 3: Create another todo item with different attributes
  const todo2: ITodoAppTodo = await api.functional.todoApp.admin.todos.create(
    connection,
    {
      body: {
        title: "Review code quality standards",
        description:
          "Establish and document code review guidelines for the development team",
        status: "pending",
        business_status: "active",
        priority: "medium",
        category: "process",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);

  // Step 4: Create todo item with urgent priority
  const todo3: ITodoAppTodo = await api.functional.todoApp.admin.todos.create(
    connection,
    {
      body: {
        title: "Fix critical security vulnerability",
        description:
          "Address security issue identified in authentication module",
        status: "pending",
        business_status: "active",
        priority: "urgent",
        category: "security",
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);

  // Step 5: Validate todo creation with assertions
  TestValidator.equals(
    "first todo has correct title",
    todo1.title,
    "Complete project documentation",
  );
  TestValidator.equals(
    "first todo has correct priority",
    todo1.priority,
    "high",
  );
  TestValidator.equals(
    "first todo has correct category",
    todo1.category,
    "development",
  );
  TestValidator.equals(
    "first todo has pending status",
    todo1.status,
    "pending",
  );
  TestValidator.equals(
    "first todo has active business status",
    todo1.business_status,
    "active",
  );

  TestValidator.equals(
    "second todo has correct title",
    todo2.title,
    "Review code quality standards",
  );
  TestValidator.equals(
    "second todo has correct priority",
    todo2.priority,
    "medium",
  );
  TestValidator.equals(
    "second todo has correct category",
    todo2.category,
    "process",
  );

  TestValidator.equals(
    "third todo has correct title",
    todo3.title,
    "Fix critical security vulnerability",
  );
  TestValidator.equals(
    "third todo has correct priority",
    todo3.priority,
    "urgent",
  );
  TestValidator.equals(
    "third todo has correct category",
    todo3.category,
    "security",
  );

  // Step 6: Verify todos have proper ownership and timestamps
  TestValidator.predicate(
    "all todos have valid UUIDs",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo1.id,
    ) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        todo2.id,
      ) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        todo3.id,
      ),
  );

  TestValidator.predicate(
    "all todos have proper timestamps",
    todo1.created_at !== undefined &&
      todo1.updated_at !== undefined &&
      todo2.created_at !== undefined &&
      todo2.updated_at !== undefined &&
      todo3.created_at !== undefined &&
      todo3.updated_at !== undefined,
  );

  TestValidator.predicate(
    "first todo has due date set",
    todo1.due_date !== undefined,
  );
  TestValidator.predicate(
    "third todo has due date set",
    todo3.due_date !== undefined,
  );
  TestValidator.predicate(
    "second todo has no due date",
    todo2.due_date === undefined,
  );

  // Step 7: Test todos are properly created without soft deletion
  TestValidator.predicate(
    "no todos are soft deleted",
    todo1.deleted_at === undefined &&
      todo2.deleted_at === undefined &&
      todo3.deleted_at === undefined,
  );
}
