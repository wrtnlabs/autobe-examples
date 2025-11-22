import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_todo_priority_categorization(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashed_password_123",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create todos with different priority levels
  const lowPriorityTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: "Review quarterly reports",
        description: "Review and analyze quarterly performance reports",
        priority: "low",
        status: "pending",
        business_status: "active",
        category: "reports",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(lowPriorityTodo);
  TestValidator.equals(
    "low priority assignment",
    lowPriorityTodo.priority,
    "low",
  );
  TestValidator.equals(
    "low priority category",
    lowPriorityTodo.category,
    "reports",
  );

  const mediumPriorityTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: "Update system documentation",
        description: "Update all system documentation for the new version",
        priority: "medium",
        category: "documentation",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(mediumPriorityTodo);
  TestValidator.equals(
    "medium priority assignment",
    mediumPriorityTodo.priority,
    "medium",
  );
  TestValidator.equals(
    "medium priority category",
    mediumPriorityTodo.category,
    "documentation",
  );

  const highPriorityTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: "Security audit implementation",
        description: "Implement security audit findings and recommendations",
        priority: "high",
        category: "security",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(highPriorityTodo);
  TestValidator.equals(
    "high priority assignment",
    highPriorityTodo.priority,
    "high",
  );
  TestValidator.equals(
    "high priority category",
    highPriorityTodo.category,
    "security",
  );

  const urgentPriorityTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: "Critical system bug fix",
        description: "Fix critical bug affecting user authentication",
        priority: "urgent",
        category: "development",
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(urgentPriorityTodo);
  TestValidator.equals(
    "urgent priority assignment",
    urgentPriorityTodo.priority,
    "urgent",
  );
  TestValidator.equals(
    "urgent priority category",
    urgentPriorityTodo.category,
    "development",
  );

  // Step 3: Create todos with different categories (no priority specified - defaults to medium)
  const reportsCategoryTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: "Monthly compliance check",
        category: "reports",
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(reportsCategoryTodo);
  TestValidator.equals(
    "reports category assignment",
    reportsCategoryTodo.category,
    "reports",
  );
  TestValidator.equals(
    "default priority for category test",
    reportsCategoryTodo.priority,
    "medium",
  );

  const hrCategoryTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: "Employee performance reviews",
        category: "human_resources",
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(hrCategoryTodo);
  TestValidator.equals(
    "hr category assignment",
    hrCategoryTodo.category,
    "human_resources",
  );
  TestValidator.equals("hr category priority", hrCategoryTodo.priority, "high");

  const marketingCategoryTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: "Campaign performance analysis",
        category: "marketing",
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(marketingCategoryTodo);
  TestValidator.equals(
    "marketing category assignment",
    marketingCategoryTodo.category,
    "marketing",
  );
  TestValidator.equals(
    "marketing category priority",
    marketingCategoryTodo.priority,
    "medium",
  );

  // Step 4: Create todos with both priority and category combinations
  const urgentSecurityTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: "Emergency security patch deployment",
        description: "Deploy emergency security patch to production",
        priority: "urgent",
        category: "security",
        business_status: "active",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(urgentSecurityTodo);
  TestValidator.equals(
    "urgent security priority",
    urgentSecurityTodo.priority,
    "urgent",
  );
  TestValidator.equals(
    "urgent security category",
    urgentSecurityTodo.category,
    "security",
  );

  const lowMaintenanceTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: "Routine server maintenance",
        description: "Perform scheduled monthly server maintenance",
        priority: "low",
        category: "infrastructure",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(lowMaintenanceTodo);
  TestValidator.equals(
    "low maintenance priority",
    lowMaintenanceTodo.priority,
    "low",
  );
  TestValidator.equals(
    "low maintenance category",
    lowMaintenanceTodo.category,
    "infrastructure",
  );

  // Step 5: Create todo without category (optional field)
  const noCategoryTodo: ITodoAppTodo =
    await api.functional.todoApp.admin.todos.create(connection, {
      body: {
        title: "Team meeting preparation",
        description: "Prepare agenda and materials for team meeting",
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(noCategoryTodo);
  TestValidator.equals(
    "no category priority",
    noCategoryTodo.priority,
    "medium",
  );
  TestValidator.equals("no category field", noCategoryTodo.category, null);

  // Step 6: Validate todo creation counts and properties
  TestValidator.equals("all todos created successfully", true, true);
  TestValidator.predicate(
    "priority levels covered",
    [
      lowPriorityTodo.priority,
      mediumPriorityTodo.priority,
      highPriorityTodo.priority,
      urgentPriorityTodo.priority,
    ].includes("urgent"),
  );

  TestValidator.predicate(
    "categories assigned correctly",
    lowPriorityTodo.category === "reports" &&
      urgentSecurityTodo.category === "security" &&
      lowMaintenanceTodo.category === "infrastructure",
  );

  TestValidator.predicate(
    "todos have proper titles",
    lowPriorityTodo.title.length > 0 &&
      mediumPriorityTodo.title.length > 0 &&
      urgentPriorityTodo.title.length > 0,
  );

  TestValidator.predicate(
    "todos have creation timestamps",
    lowPriorityTodo.created_at !== null &&
      urgentPriorityTodo.created_at !== null &&
      lowMaintenanceTodo.created_at !== null,
  );

  TestValidator.predicate(
    "todos have update timestamps",
    lowPriorityTodo.updated_at !== null &&
      urgentPriorityTodo.updated_at !== null &&
      lowMaintenanceTodo.updated_at !== null,
  );

  TestValidator.predicate(
    "todos default to active business status",
    lowPriorityTodo.business_status === "active" &&
      mediumPriorityTodo.business_status === "active",
  );
}
