import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test rapid task creation for simple todo items that users need to capture
 * quickly. Focuses on minimal required fields with optional enhancements to
 * test the app's quick capture capabilities. Validates efficient workflow where
 * users can instantly record tasks without extensive configuration while
 * maintaining full functionality.
 *
 * 1. Create user account for authentication
 * 2. Test minimal task creation (title only)
 * 3. Test task creation with optional description
 * 4. Test task creation with priority setting
 * 5. Test task creation with due date
 * 6. Test task creation with completed status
 * 7. Verify task appears in search results after creation
 * 8. Test various combinations of optional fields
 */
export async function test_api_quick_task_capture(connection: api.IConnection) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test minimal task creation (title only)
  const minimalTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Quick task capture test",
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(minimalTask);
  TestValidator.equals(
    "minimal task title",
    minimalTask.title,
    "Quick task capture test",
  );
  TestValidator.equals("minimal task status", minimalTask.status, "pending");

  // Step 3: Test task creation with optional description
  const taskWithDescription = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Task with detailed description",
        description:
          "This task has additional context for better understanding",
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskWithDescription);
  TestValidator.equals(
    "task with description title",
    taskWithDescription.title,
    "Task with detailed description",
  );
  TestValidator.equals(
    "task description",
    taskWithDescription.description,
    "This task has additional context for better understanding",
  );

  // Step 4: Test task creation with priority setting
  const priorityTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "High priority task",
        status: "pending",
        priority: "high",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(priorityTask);
  TestValidator.equals(
    "priority task title",
    priorityTask.title,
    "High priority task",
  );
  TestValidator.equals("priority level", priorityTask.priority, "high");

  // Step 5: Test task creation with due date
  const dueDateTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Task with deadline",
        status: "pending",
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(dueDateTask);
  TestValidator.equals(
    "due date task title",
    dueDateTask.title,
    "Task with deadline",
  );
  TestValidator.predicate("due date is set", dueDateTask.due_date !== null);

  // Step 6: Test task creation with completed status
  const completedTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Already completed task",
        status: "completed",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask);
  TestValidator.equals(
    "completed task title",
    completedTask.title,
    "Already completed task",
  );
  TestValidator.equals("completed status", completedTask.status, "completed");
  TestValidator.predicate(
    "completed at timestamp is set",
    completedTask.completed_at !== null,
  );

  // Step 7: Verify task appears in search results after creation
  const searchResults = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        search: "capture",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results contain created task",
    searchResults.data.length > 0,
  );
  TestValidator.predicate(
    "search found capture task",
    searchResults.data.some((task) => task.title.includes("capture")),
  );

  // Step 8: Test various combinations of optional fields
  const complexTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Complex task with all options",
        description:
          "This task includes description, high priority, and due date",
        status: "pending",
        priority: "high",
        due_date: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(complexTask);
  TestValidator.equals(
    "complex task title",
    complexTask.title,
    "Complex task with all options",
  );
  TestValidator.equals(
    "complex task description",
    complexTask.description,
    "This task includes description, high priority, and due date",
  );
  TestValidator.equals("complex task priority", complexTask.priority, "high");
  TestValidator.predicate(
    "complex task due date is set",
    complexTask.due_date !== null,
  );
}
