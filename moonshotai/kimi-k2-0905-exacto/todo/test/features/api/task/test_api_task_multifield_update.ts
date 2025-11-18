import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test comprehensive task updates modifying multiple properties simultaneously
 * including title, description, status, priority, and due date. Validates that
 * complex partial updates preserve all user modifications while leaving
 * unspecified properties unchanged.
 *
 * This test implements a comprehensive workflow to validate multi-field task
 * updates:
 *
 * 1. User registration and authentication
 * 2. Task creation with specific initial properties
 * 3. Multiple partial updates testing different property combinations
 * 4. Validation of partial update behavior
 *
 * The test demonstrates that the update API properly handles:
 *
 * - Simultaneous updates to multiple fields (title, description, priority,
 *   status, due date)
 * - Partial updates that leave some fields unchanged
 * - Status transitions from pending to completed
 * - Due date validation within 5-year constraint
 * - Title length validation with 200-character maximum
 * - Property preservation when fields are not specified in update
 */
export async function test_api_task_multifield_update(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "TestPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo/app",
      referrer: "https://example.com/auth/join",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create initial task with comprehensive properties
  const originalTitle = "Original Task Title for Multi-field Update Testing";
  const originalDescription =
    "This task was created specifically to test multi-field update functionality across various property combinations.";

  const initialTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
        status: "pending",
        priority: "medium",
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(initialTask);

  TestValidator.equals(
    "initial title matches",
    initialTask.title,
    originalTitle,
  );
  TestValidator.equals(
    "initial description matches",
    initialTask.description,
    originalDescription,
  );
  TestValidator.equals("initial status", initialTask.status, "pending");
  TestValidator.equals("initial priority", initialTask.priority, "medium");

  // Step 3: Test comprehensive multi-field update
  const updatedTitle =
    "Updated Task Title with More Detail for Comprehensive Testing";
  const updatedDescription =
    "This description has been modified to test the multi-field update functionality. The content is different from the original to ensure updates are properly applied.";
  const updatedPriority = RandomGenerator.pick([
    "low",
    "medium",
    "high",
  ] as const);
  const updatedDueDate = new Date(
    Date.now() + 60 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 60 days from now

  const multiFieldUpdatedTask =
    await api.functional.todoApp.user.users.tasks.update(connection, {
      userId: user.id,
      taskId: initialTask.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        priority: updatedPriority,
        due_date: updatedDueDate,
      } satisfies ITodoAppTask.IUpdate,
    });
  typia.assert(multiFieldUpdatedTask);

  TestValidator.equals(
    "title updated correctly",
    multiFieldUpdatedTask.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description updated correctly",
    multiFieldUpdatedTask.description,
    updatedDescription,
  );
  TestValidator.equals(
    "priority updated correctly",
    multiFieldUpdatedTask.priority,
    updatedPriority,
  );
  TestValidator.equals(
    "due date updated correctly",
    multiFieldUpdatedTask.due_date,
    updatedDueDate,
  );
  TestValidator.equals(
    "status unchanged during multi-field update",
    multiFieldUpdatedTask.status,
    "pending",
  ); // Status was not in update body, should remain unchanged

  // Step 4: Test status change with title update only
  const statusUpdate = await api.functional.todoApp.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: initialTask.id,
      body: {
        title: "Task Updated to Completed Status",
        status: "completed",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(statusUpdate);

  TestValidator.equals(
    "status changed to completed",
    statusUpdate.status,
    "completed",
  );
  await TestValidator.predicate(
    "completion date set after status change",
    statusUpdate.completed_at !== null &&
      statusUpdate.completed_at !== undefined,
  );
  TestValidator.equals(
    "priority preserved from previous update",
    statusUpdate.priority,
    updatedPriority,
  );
  TestValidator.equals(
    "due date preserved from previous update",
    statusUpdate.due_date,
    updatedDueDate,
  );

  // Step 5: Test maximum title length validation
  const maxLengthTitle = RandomGenerator.alphabets(200); // Exactly 200 characters
  const maxTitleTask = await api.functional.todoApp.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: initialTask.id,
      body: {
        title: maxLengthTitle,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(maxTitleTask);

  TestValidator.equals(
    "task with maximum title length",
    maxTitleTask.title.length,
    200,
  );
  await TestValidator.predicate(
    "title content matches exactly",
    typia.is<string & tags.MaxLength<200>>(maxTitleTask.title),
  );

  // Step 6: Test description and priority clearing (null)
  const selectiveUpdateTask =
    await api.functional.todoApp.user.users.tasks.update(connection, {
      userId: user.id,
      taskId: initialTask.id,
      body: {
        description: null,
        priority: null,
      } satisfies ITodoAppTask.IUpdate,
    });
  typia.assert(selectiveUpdateTask);

  TestValidator.equals(
    "description cleared correctly",
    selectiveUpdateTask.description,
    null,
  );
  TestValidator.equals(
    "priority cleared correctly",
    selectiveUpdateTask.priority,
    null,
  );
  TestValidator.equals(
    "title preserved during selective update",
    selectiveUpdateTask.title,
    maxLengthTitle,
  );

  // Step 7: Test due date validation within 5-year constraint
  const validFutureDate = new Date(
    Date.now() + 3 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // ~3 years from now
  const validDueDateTask = await api.functional.todoApp.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: initialTask.id,
      body: {
        due_date: validFutureDate,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(validDueDateTask);

  TestValidator.equals(
    "due date updated within valid range",
    validDueDateTask.due_date,
    validFutureDate,
  );
}
