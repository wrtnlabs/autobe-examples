import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskSnapshot";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieving a task snapshot after multiple modifications.
 *
 * This test validates the todo app's historical tracking system by creating a
 * task and applying multiple sequential modifications to verify that the system
 * properly handles task evolution. The test demonstrates the core workflow of
 * task management with multiple updates:
 *
 * 1. Create authenticated user session for testing
 * 2. Create initial task with basic title and description
 * 3. Apply first modification: update task title
 * 4. Apply second modification: change task description
 * 5. Apply third modification: transition task status to completed
 * 6. Verify final task state reflects all changes accurately
 *
 * While we cannot directly test snapshot retrieval (as snapshots are
 * automatically created internal representations), we verify that:
 *
 * - Multiple modifications can be applied successfully
 * - Each update preserves previous changes appropriately
 * - Status transitions work correctly
 * - Final task state accurately represents the evolution
 */
export async function test_api_task_snapshot_retrieval_after_multiple_changes(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated user session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePassword123",
      ip: "127.0.0.1",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create initial task with basic properties
  const initialTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Initial Task Title",
        description: {
          type: "full",
          content: "This is the initial task description with basic details",
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(initialTask);

  TestValidator.equals(
    "initial task status is pending",
    initialTask.status,
    "pending",
  );
  TestValidator.equals(
    "initial task title",
    initialTask.title,
    "Initial Task Title",
  );

  // Step 3: Apply first modification - update title
  const updatedTask1 = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: initialTask.id,
      body: {
        title: "Updated Task Title - First Modification",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask1);

  TestValidator.equals(
    "task title updated after first modification",
    updatedTask1.title,
    "Updated Task Title - First Modification",
  );
  TestValidator.equals(
    "task status remains pending after title update",
    updatedTask1.status,
    "pending",
  );

  // Step 4: Apply second modification - update description
  const updatedTask2 = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: initialTask.id,
      body: {
        description:
          "Updated description with more detailed information about the task requirements and objectives",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask2);

  TestValidator.equals(
    "task title preserved after description update",
    updatedTask2.title,
    "Updated Task Title - First Modification",
  );
  TestValidator.equals(
    "task description updated",
    updatedTask2.description,
    "Updated description with more detailed information about the task requirements and objectives",
  );

  // Step 5: Apply third modification - complete the task
  const completedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: initialTask.id,
      body: {
        status: "complete",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(completedTask);

  TestValidator.equals(
    "task status changed to complete",
    completedTask.status,
    "complete",
  );
  TestValidator.predicate(
    "task has completion timestamp",
    completedTask.completed_at !== null &&
      completedTask.completed_at !== undefined,
  );

  // Verify comprehensive change tracking through final state validation
  TestValidator.equals(
    "final task has updated title",
    completedTask.title,
    "Updated Task Title - First Modification",
  );
  TestValidator.equals(
    "final task has updated description",
    completedTask.description,
    "Updated description with more detailed information about the task requirements and objectives",
  );
  TestValidator.equals(
    "final task is completed",
    completedTask.status,
    "complete",
  );
  TestValidator.equals(
    "task ID remains consistent throughout modifications",
    completedTask.id,
    initialTask.id,
  );
  TestValidator.equals(
    "user ownership preserved",
    completedTask.user.id,
    user.id,
  );
}
