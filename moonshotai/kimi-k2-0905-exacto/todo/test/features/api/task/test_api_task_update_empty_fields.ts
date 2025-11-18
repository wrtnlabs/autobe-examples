import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test removing optional fields by setting them to null including due date and
 * description.
 *
 * This test validates that optional fields can be cleared without affecting
 * required fields and ensures proper handling of null values for optional field
 * removal in task management.
 *
 * Test flow:
 *
 * 1. Create user account for field testing
 * 2. Create task with populated optional fields to clear
 * 3. Update task by setting optional fields (due_date and description) to null
 * 4. Verify optional fields are cleared while required fields remain intact
 */
export async function test_api_task_update_empty_fields(
  connection: api.IConnection,
) {
  // Step 1: Create user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
      name: RandomGenerator.name(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create task with populated optional fields
  const dueDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      status: "pending",
      priority: "high",
      due_date: dueDate,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // Verify initial task has optional fields populated
  TestValidator.predicate(
    "initial task has description",
    task.description !== null && task.description !== undefined,
  );
  TestValidator.predicate(
    "initial task has due_date",
    task.due_date !== null && task.due_date !== undefined,
  );
  TestValidator.equals("initial task priority", task.priority, "high");

  // Step 3: Update task by setting optional fields to null
  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: task.id,
      body: {
        description: null,
        due_date: null,
        priority: null,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  // Step 4: Verify optional fields are cleared while required fields remain intact
  TestValidator.equals("updated task id", updatedTask.id, task.id);
  TestValidator.equals("updated task title", updatedTask.title, task.title);
  TestValidator.equals("updated task status", updatedTask.status, task.status);
  TestValidator.equals("updated task user", updatedTask.user.id, task.user.id);

  // Verify optional fields are now null
  TestValidator.equals("description cleared", updatedTask.description, null);
  TestValidator.equals("due_date cleared", updatedTask.due_date, null);
  TestValidator.equals("priority cleared", updatedTask.priority, null);

  // Verify required fields remain unchanged
  TestValidator.notEquals(
    "updated_at changed",
    updatedTask.updated_at,
    task.updated_at,
  );
}
