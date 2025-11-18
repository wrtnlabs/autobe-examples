import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IError } from "@ORGANIZATION/PROJECT-api/lib/structures/IError";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDeletion";
import type { ITodoAppTaskId } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskId";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful bulk deletion of multiple tasks where all tasks are valid and
 * belong to the authenticated user. Validates that bulk deletion operation
 * processes all requested tasks atomically, returns accurate count of deleted
 * tasks, and maintains system consistency. Scenario includes creating a new
 * user, creating multiple tasks with various properties (different priorities,
 * categories), then performing bulk deletion to ensure complete removal of all
 * specified tasks with proper summary reporting.
 */
export async function test_api_task_bulk_delete_success_all_tasks(
  connection: api.IConnection,
) {
  // Create a new authenticated user
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "StrongPassword123",
        ip: "127.0.0.1",
        href: `https://${connection.host}/welcome`,
        referrer: `https://${connection.host}/register`,
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  TestValidator.equals("user creation successful", user.email, userEmail);

  // Create categories for task organization
  const personalCategory: ITodoAppCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Personal Tasks",
        description: "Personal life related tasks",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(personalCategory);
  TestValidator.equals(
    "personal category created",
    personalCategory.name,
    "Personal Tasks",
  );

  const workCategory: ITodoAppCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Work Tasks",
        description: "Professional work related tasks",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(workCategory);
  TestValidator.equals(
    "work category created",
    workCategory.name,
    "Work Tasks",
  );

  // Create multiple tasks with different priorities and categories
  // Use consistent future due dates within the 1-year constraint
  const futureDate1 = new Date(Date.now() + 86400000 * 2).toISOString(); // 2 days from now
  const futureDate2 = new Date(Date.now() + 86400000 * 3).toISOString(); // 3 days from now
  const futureDate3 = new Date(Date.now() + 86400000 * 4).toISOString(); // 4 days from now

  const task1: ITodoAppTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Complete high priority personal task",
        description:
          "This is an urgent personal task that needs immediate attention",
        todo_app_category_id: personalCategory.id,
        priority: "High",
        due_date: futureDate1,
        completion_order: 1,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task1);
  TestValidator.equals(
    "task1 assigned to personal category with high priority",
    task1.category?.id,
    personalCategory.id,
  );
  TestValidator.equals("task1 has high priority", task1.priority, "High");
  TestValidator.equals("task1 is pending by default", task1.status, "pending");

  const task2: ITodoAppTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Complete medium priority work task",
        description: "This is a work related task with medium priority",
        todo_app_category_id: workCategory.id,
        priority: "Medium",
        due_date: futureDate2,
        completion_order: 2,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task2);
  TestValidator.equals(
    "task2 assigned to work category with medium priority",
    task2.category?.id,
    workCategory.id,
  );
  TestValidator.equals("task2 has medium priority", task2.priority, "Medium");

  const task3: ITodoAppTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Complete low priority uncategorized task",
        description: "This is a low priority task without category assignment",
        priority: "Low",
        completion_order: 3,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task3);
  TestValidator.equals("task3 has no category", task3.category, null);
  TestValidator.equals("task3 has low priority", task3.priority, "Low");

  const task4: ITodoAppTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Another high priority personal task",
        todo_app_category_id: personalCategory.id,
        priority: "High",
        due_date: futureDate3,
        completion_order: 4,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task4);
  TestValidator.equals(
    "task4 assigned to personal category",
    task4.category?.id,
    personalCategory.id,
  );

  const task5: ITodoAppTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Work task without priority",
        description: "Simple work task description",
        todo_app_category_id: workCategory.id,
        completion_order: 5,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task5);
  TestValidator.equals(
    "task5 assigned to work category",
    task5.category?.id,
    workCategory.id,
  );

  // Store task IDs for bulk deletion
  const taskIds: ITodoAppTaskId[] = [
    { id: task1.id },
    { id: task2.id },
    { id: task3.id },
    { id: task4.id },
    { id: task5.id },
  ];

  TestValidator.equals("created 5 tasks successfully", taskIds.length, 5);

  // Verify user ownership for all created tasks
  TestValidator.equals("task1 belongs to user", task1.user.id, user.id);
  TestValidator.equals("task2 belongs to user", task2.user.id, user.id);
  TestValidator.equals("task3 belongs to user", task3.user.id, user.id);
  TestValidator.equals("task4 belongs to user", task4.user.id, user.id);
  TestValidator.equals("task5 belongs to user", task5.user.id, user.id);

  // Perform bulk deletion of all tasks
  const deletionResult: ITodoAppTaskDeletion.ISummary =
    await api.functional.todoApp.user.tasks.bulk_delete.bulkDelete(connection, {
      body: {
        task_ids: taskIds,
      } satisfies ITodoAppTaskDeletion.ICreate,
    });

  // Validate the deletion result
  typia.assert(deletionResult);

  TestValidator.equals(
    "deletion result contains correct total count",
    deletionResult.total_requested,
    5,
  );
  TestValidator.equals(
    "deletion result shows all tasks deleted",
    deletionResult.deleted_count,
    5,
  );
  TestValidator.equals(
    "no errors in deletion process",
    deletionResult.errors.length,
    0,
  );
  TestValidator.predicate(
    "deletion says successful bulk deletion completed",
    deletionResult.total_requested === 5 &&
      deletionResult.deleted_count === 5 &&
      deletionResult.errors.length === 0,
  );
}
