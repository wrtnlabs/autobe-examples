import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test creation of urgent high-priority tasks for immediate attention items.
 *
 * Validates the complete urgent task workflow including priority assignment,
 * due date setting, and content organization for time-sensitive work items.
 * Simulates scenarios where users need to quickly capture urgent tasks with
 * full context including priority and completion tracking.
 *
 * Test Steps:
 *
 * 1. Create authenticated user account
 * 2. Create urgent task with high priority and due date
 * 3. Create multiple urgent tasks with varying priorities
 * 4. Verify task properties and organization
 * 5. Test complete workflow for urgent task management
 */
export async function test_api_urgent_task_creation(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePass123!",
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/signup",
      referrer: "https://todoapp.example.com/",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create urgent task with high priority and due date
  const urgentDueDate = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString(); // Tomorrow
  const urgentTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Complete urgent project deliverable",
        description:
          "Finalize and submit the quarterly report to stakeholders by end of business day",
        status: "pending",
        priority: "high",
        due_date: urgentDueDate,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(urgentTask);

  // Verify urgent task properties
  TestValidator.equals(
    "urgent task has high priority",
    urgentTask.priority,
    "high",
  );
  TestValidator.equals(
    "urgent task status is pending",
    urgentTask.status,
    "pending",
  );
  TestValidator.predicate(
    "urgent task has due date",
    urgentTask.due_date !== null && urgentTask.due_date !== undefined,
  );
  TestValidator.equals(
    "urgent task title matches",
    urgentTask.title,
    "Complete urgent project deliverable",
  );
  TestValidator.equals("urgent task user matches", urgentTask.user.id, user.id);

  // Step 3: Create multiple urgent tasks with varying priorities
  const mediumUrgentTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Review client feedback",
        description:
          "Address urgent client concerns about the latest feature release",
        status: "pending",
        priority: "medium",
        due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(mediumUrgentTask);

  const lowPriorityTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Update documentation",
        description: "Add new API endpoints to the technical documentation",
        status: "pending",
        priority: "low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(lowPriorityTask);

  const criticalTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Fix production bug",
        description:
          "Critical issue affecting user login - needs immediate attention",
        status: "pending",
        priority: "high",
        due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(criticalTask);

  // Step 4: Verify task organization and properties
  TestValidator.equals(
    "medium urgent task has medium priority",
    mediumUrgentTask.priority,
    "medium",
  );
  TestValidator.equals(
    "low priority task has low priority",
    lowPriorityTask.priority,
    "low",
  );
  TestValidator.equals(
    "critical task has high priority",
    criticalTask.priority,
    "high",
  );

  TestValidator.predicate(
    "low priority task has no due date",
    lowPriorityTask.due_date === null || lowPriorityTask.due_date === undefined,
  );
  TestValidator.predicate(
    "medium urgent task has due date",
    mediumUrgentTask.due_date !== null &&
      mediumUrgentTask.due_date !== undefined,
  );
  TestValidator.predicate(
    "critical task has due date",
    criticalTask.due_date !== null && criticalTask.due_date !== undefined,
  );

  // Verify all tasks belong to the same user
  TestValidator.equals("urgent task user matches", urgentTask.user.id, user.id);
  TestValidator.equals(
    "medium urgent task user matches",
    mediumUrgentTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "low priority task user matches",
    lowPriorityTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "critical task user matches",
    criticalTask.user.id,
    user.id,
  );

  // Verify task creation timestamps
  TestValidator.predicate(
    "tasks have creation timestamps",
    urgentTask.created_at !== null &&
      mediumUrgentTask.created_at !== null &&
      lowPriorityTask.created_at !== null &&
      criticalTask.created_at !== null,
  );

  // Step 5: Test complete workflow validation
  TestValidator.predicate(
    "all tasks are in pending status",
    urgentTask.status === "pending" &&
      mediumUrgentTask.status === "pending" &&
      lowPriorityTask.status === "pending" &&
      criticalTask.status === "pending",
  );

  // Verify task descriptions are properly stored
  TestValidator.predicate(
    "urgent task has description",
    urgentTask.description !== null && urgentTask.description !== undefined,
  );
  TestValidator.predicate(
    "critical task has description",
    criticalTask.description !== null && criticalTask.description !== undefined,
  );

  TestValidator.equals(
    "all tasks have unique IDs",
    new Set([
      urgentTask.id,
      mediumUrgentTask.id,
      lowPriorityTask.id,
      criticalTask.id,
    ]).size,
    4,
  );
}
