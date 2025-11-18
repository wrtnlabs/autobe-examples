import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating a task to assign it to a specific category.
 *
 * This test validates the complete category assignment workflow by:
 *
 * 1. Creating a new user account for authentication
 * 2. Creating a category for task organization
 * 3. Creating a task without initial category assignment
 * 4. Updating the task to assign it to the created category
 * 5. Validating the task now includes complete category information
 *
 * The test ensures foreign key validation works correctly and that tasks can be
 * properly organized within user-owned categories.
 */
export async function test_api_task_update_category_assignment(
  connection: api.IConnection,
) {
  // Step 1: Create user account and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePassword123",
      ip: "192.168.1.1",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a category for task organization
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create a task without category assignment
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now, within 1 year constraint
      completion_order: 1,
      // No todo_app_category_id - task created without category
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // Validate task was created without category
  TestValidator.equals("task initially has no category", task.category, null);

  // Step 4: Update task to assign it to the category
  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: task.id,
      body: {
        todo_app_category_id: category.id,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  // Step 5: Validate category assignment was successful
  TestValidator.equals(
    "task now has category",
    updatedTask.category !== null,
    true,
  );
  TestValidator.equals(
    "category ID matches",
    updatedTask.category!.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    updatedTask.category!.name,
    category.name,
  );
  TestValidator.equals("task title unchanged", updatedTask.title, task.title);
  TestValidator.equals(
    "task description unchanged",
    updatedTask.description,
    task.description,
  );
}
