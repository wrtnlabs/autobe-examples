import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppActivityLog";
import type { ITodoAppActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActivityLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_activity_logs_date_range_filtering(
  connection: api.IConnection,
) {
  // MODIFIED SCENARIO: Test activity log generation through todo creation
  // Since the activity logs filtering endpoint is not available in the provided SDK,
  // this test validates that admin and user authentication work correctly,
  // and that users can create todos which would generate activity logs.
  // The actual activity log retrieval would require the missing admin activity-logs endpoint.

  // Step 1: Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        password_confirmation: "AdminPassword123",
      } satisfies ITodoAppAdmin.IRegister,
    },
  );
  typia.assert(admin);
  TestValidator.predicate(
    "admin account created successfully",
    admin.id !== undefined && admin.email === adminEmail,
  );

  // Step 2: Register a regular user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "UserPassword123",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  TestValidator.predicate(
    "user account created successfully",
    user.id !== undefined && user.email === userEmail,
  );

  // Step 3: Create first todo with high priority
  const todo1: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "High Priority Task",
        description: "First todo created for activity log",
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  TestValidator.predicate(
    "first todo created with high priority",
    todo1.priority === "high" && todo1.status === "active",
  );

  // Step 4: Create second todo with medium priority
  const todo2: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Medium Priority Task",
        description: "Second todo for activity log generation",
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  TestValidator.predicate(
    "second todo created with medium priority",
    todo2.priority === "medium" && todo2.status === "active",
  );

  // Step 5: Create third todo with low priority and due date
  const futureDueDate = new Date();
  futureDueDate.setDate(futureDueDate.getDate() + 7); // 7 days from now
  const dueDateString = futureDueDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD

  const todo3: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Low Priority Task",
        description: "Third todo with due date",
        priority: "low",
        due_date: dueDateString,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  TestValidator.predicate(
    "third todo created with low priority and due date",
    todo3.priority === "low" && todo3.due_date === dueDateString,
  );

  // Step 6: Verify created todos have correct timestamps
  TestValidator.predicate(
    "todo1 has valid created_at timestamp",
    todo1.created_at !== undefined && new Date(todo1.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "todo2 has valid created_at timestamp",
    todo2.created_at !== undefined && new Date(todo2.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "todo3 has valid created_at timestamp",
    todo3.created_at !== undefined && new Date(todo3.created_at).getTime() > 0,
  );

  // Step 7: Verify timestamps are in chronological order
  const todo1Time = new Date(todo1.created_at).getTime();
  const todo2Time = new Date(todo2.created_at).getTime();
  const todo3Time = new Date(todo3.created_at).getTime();

  TestValidator.predicate(
    "todos created in chronological order",
    todo1Time <= todo2Time && todo2Time <= todo3Time,
  );

  // Step 8: Verify user information is correct
  TestValidator.equals(
    "user email matches registration",
    user.email,
    userEmail,
  );
  TestValidator.predicate("user status is active", user.status === "active");

  // Step 9: Verify admin information is correct
  TestValidator.equals(
    "admin email matches registration",
    admin.email,
    adminEmail,
  );
  TestValidator.predicate("admin status is active", admin.status === "active");

  // Step 10: Verify authentication tokens are present
  TestValidator.predicate(
    "user has valid access token",
    user.token.access !== undefined && user.token.access.length > 0,
  );
  TestValidator.predicate(
    "user has valid refresh token",
    user.token.refresh !== undefined && user.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "admin has valid access token",
    admin.token.access !== undefined && admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin has valid refresh token",
    admin.token.refresh !== undefined && admin.token.refresh.length > 0,
  );

  // Step 11: Verify token expiration times
  TestValidator.predicate(
    "user access token has expiration time",
    user.token.expired_at !== undefined &&
      new Date(user.token.expired_at).getTime() > new Date().getTime(),
  );
  TestValidator.predicate(
    "user refresh token has extended expiration",
    user.token.refreshable_until !== undefined &&
      new Date(user.token.refreshable_until).getTime() >
        new Date(user.token.expired_at).getTime(),
  );

  // Step 12: Summary - todos created successfully for activity log generation
  // Note: Activity log retrieval via admin endpoint would require the PATCH /todoApp/admin/activity-logs
  // endpoint which was not provided in the available API SDK functions.
  TestValidator.predicate(
    "all todos created successfully for activity log generation",
    todo1.id !== undefined && todo2.id !== undefined && todo3.id !== undefined,
  );
}
