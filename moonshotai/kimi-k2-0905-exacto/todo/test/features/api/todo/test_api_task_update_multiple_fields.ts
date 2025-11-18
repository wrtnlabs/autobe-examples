import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_update_multiple_fields(
  connection: api.IConnection,
) {
  // Create test user for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      href: `${connection.host}/register`,
      referrer: `${connection.host}/home`,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create initial task with basic information
  const initialDueDate = RandomGenerator.date(
    new Date(),
    60 * 24 * 60 * 60 * 1000,
  ).toISOString(); // Within 60 days
  const initialTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Complete project documentation",
        description:
          "Write comprehensive API documentation for the new features",
        status: "pending",
        priority: "medium",
        due_date: initialDueDate,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(initialTask);

  TestValidator.equals(
    "task created successfully",
    initialTask.title,
    "Complete project documentation",
  );
  TestValidator.equals("task initial priority", initialTask.priority, "medium");
  TestValidator.equals("task initial status", initialTask.status, "pending");

  // Update multiple fields simultaneously
  const updatedDueDate = RandomGenerator.date(
    new Date(),
    30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // Within 30 days
  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: initialTask.id,
      body: {
        title: "Revamped project documentation with new standards",
        description:
          "Comprehensive API documentation including examples, usage patterns and troubleshooting guides",
        priority: "high",
        due_date: updatedDueDate,
        status: "completed",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  TestValidator.equals("task updated id", updatedTask.id, initialTask.id);
  TestValidator.equals("task updated user id", updatedTask.user.id, user.id);

  TestValidator.equals(
    "task title updated",
    updatedTask.title,
    "Revamped project documentation with new standards",
  );
  TestValidator.equals(
    "task description updated",
    updatedTask.description,
    "Comprehensive API documentation including examples, usage patterns and troubleshooting guides",
  );
  TestValidator.equals("task priority updated", updatedTask.priority, "high");
  TestValidator.equals(
    "task due date updated",
    updatedTask.due_date,
    updatedDueDate,
  );
  TestValidator.equals("task status updated", updatedTask.status, "completed");

  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedTask.updated_at,
    initialTask.updated_at,
  );
  TestValidator.predicate(
    "completed_at is set",
    updatedTask.completed_at !== null && updatedTask.completed_at !== undefined,
  );

  // Edit existing task again to test partial updates with multiple fields
  const secondUpdate = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: updatedTask.id,
      body: {
        title: null, // Clear title - tests nullable field update
        priority: "none",
        due_date: null, // Clear due date - tests nullable field update
        status: "pending",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(secondUpdate);

  TestValidator.equals("task title cleared", secondUpdate.title, null);
  TestValidator.equals(
    "task priority set to none",
    secondUpdate.priority,
    "none",
  );
  TestValidator.equals("task due date cleared", secondUpdate.due_date, null);
  TestValidator.equals(
    "task status reverted to pending",
    secondUpdate.status,
    "pending",
  );
  TestValidator.equals(
    "completed_at cleared when status is pending",
    secondUpdate.completed_at,
    null,
  );
  TestValidator.notEquals(
    "timestamp updated again",
    secondUpdate.updated_at,
    updatedTask.updated_at,
  );

  // Comprehensive final update
  const finalUpdate = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: secondUpdate.id,
      body: {
        title: "Final documentation review and deployment",
        description:
          "Final review of all documentation before production deployment ensuring compliance with new documentation standards",
        priority: "high",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
        status: "pending",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(finalUpdate);

  TestValidator.equals(
    "task title final updated",
    finalUpdate.title,
    "Final documentation review and deployment",
  );
  TestValidator.equals(
    "task description detailed update",
    finalUpdate.description,
    "Final review of all documentation before production deployment ensuring compliance with new documentation standards",
  );
  TestValidator.equals(
    "task priority high final",
    finalUpdate.priority,
    "high",
  );
  TestValidator.equals(
    "task status pending final",
    finalUpdate.status,
    "pending",
  );
  TestValidator.predicate(
    "completed_at not set for pending task",
    finalUpdate.completed_at === null || finalUpdate.completed_at === undefined,
  );

  // Validate data integrity - timestamps and timestamps inheritance
  TestValidator.equals(
    "created_at unchanged",
    finalUpdate.created_at,
    initialTask.created_at,
  );
  TestValidator.predicate(
    "updated_at is latest",
    finalUpdate.updated_at >= secondUpdate.updated_at,
  );
  TestValidator.equals("user context preserved", finalUpdate.user.id, user.id);

  // Test business logic - priority and status interaction
  // If task is completed, completed_at should be set; if pending, completed_at should be null
  TestValidator.predicate(
    "completed_at correctly manages lifecycle state",
    (finalUpdate.status === "completed" &&
      finalUpdate.completed_at !== null &&
      finalUpdate.completed_at !== undefined) ||
      (finalUpdate.status === "pending" &&
        (finalUpdate.completed_at === null ||
          finalUpdate.completed_at === undefined)),
  );
}
