import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deleting a task that belongs to a category.
 *
 * This comprehensive test validates the complete lifecycle of a categorized
 * task, from user registration through task deletion. The test ensures that
 * category relationships are properly handled during task deletion and that
 * category integrity is maintained throughout the process.
 *
 * Test workflow:
 *
 * 1. Create a new user account to establish authentication context
 * 2. Create a task category for organizing tasks
 * 3. Create a task and assign it to the created category
 * 4. Verify the task is properly associated with the category
 * 5. Delete the task and confirm successful deletion
 * 6. Validate that the category remains intact after task deletion
 * 7. Test error cases for task deletion scenarios
 */
export async function test_api_task_delete_with_category(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePass123",
      href: "https://example.com/todo",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a task category for organization
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create multiple tasks and assign them to the category
  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 6,
      }),
      description: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 4,
        wordMax: 8,
      }),
      todo_app_category_id: category.id,
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task1);

  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 6,
      }),
      description: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 4,
        wordMax: 8,
      }),
      todo_app_category_id: category.id,
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task2);

  // Step 4: Validate the tasks are properly associated with the category
  TestValidator.equals(
    "task1 has category association",
    task1.category?.id,
    category.id,
  );
  TestValidator.equals(
    "task2 has category association",
    task2.category?.id,
    category.id,
  );
  TestValidator.equals(
    "task1 category name matches",
    task1.category?.name,
    category.name,
  );
  TestValidator.equals(
    "task2 category name matches",
    task2.category?.name,
    category.name,
  );

  // Step 5: Delete the first task
  await api.functional.todoApp.user.tasks.erase(connection, {
    taskId: task1.id,
  });

  // Step 6: Verify the category remains intact and the second task still exists
  // We validate this by creating a new task with the same category
  const newTask = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 6,
      }),
      description: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 4,
        wordMax: 8,
      }),
      todo_app_category_id: category.id,
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(newTask);

  // Validate that the new task can use the same category, proving category integrity
  TestValidator.equals(
    "new task can use same category",
    newTask.category?.id,
    category.id,
  );
  TestValidator.equals(
    "category remains available for new tasks",
    newTask.category?.name,
    category.name,
  );

  // Step 7: Test error handling for task deletion
  // Attempt to delete the same task again (should handle gracefully as it's already deleted)
  await TestValidator.error(
    "deleting non-existent task should fail",
    async () => {
      await api.functional.todoApp.user.tasks.erase(connection, {
        taskId: task1.id,
      });
    },
  );

  // Delete the remaining tasks to clean up
  await api.functional.todoApp.user.tasks.erase(connection, {
    taskId: task2.id,
  });

  await api.functional.todoApp.user.tasks.erase(connection, {
    taskId: newTask.id,
  });

  // Final validation: category should still be available for future tasks
  const finalTask = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Final test task",
      todo_app_category_id: category.id,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(finalTask);

  TestValidator.equals(
    "category persists after all task deletions",
    finalTask.category?.id,
    category.id,
  );
  TestValidator.equals(
    "final task uses same category",
    finalTask.category?.name,
    category.name,
  );

  // Clean up final task
  await api.functional.todoApp.user.tasks.erase(connection, {
    taskId: finalTask.id,
  });
}
