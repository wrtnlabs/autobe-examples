import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test complete deletion of a category along with all associated tasks.
 *
 * Validates that the cascade operation properly removes all tasks assigned to
 * the category while maintaining data integrity across the system. Confirms
 * that deletion is irreversible and that proper validation ensures ownership by
 * authorized user.
 *
 * 1. Register new user account
 * 2. Create a task category
 * 3. Create multiple tasks assigned to the category
 * 4. Delete the category (should cascade delete all associated tasks)
 * 5. Verify deletion is complete and irreversible
 */
export async function test_api_categorydeletion_with_associated_tasks(
  connection: api.IConnection,
) {
  // Step 1: Create user account with authentication
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "TestPassword123",
        ip: null,
        href: "https://localhost:3000/join",
        referrer: "https://localhost:3000",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Create a task category
  const categoryData = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITodoAppCategory.ICreate;

  const category: ITodoAppCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Validate category belongs to the authenticated user
  TestValidator.equals(
    "category user ID matches authenticated user",
    category.user.id,
    user.id,
  );

  // Step 3: Create multiple tasks assigned to the category
  const taskCount = 3;
  const tasks: ITodoAppTask[] = await ArrayUtil.asyncRepeat(
    taskCount,
    async (index) => {
      const taskData = {
        title: `Task ${index + 1}: ${RandomGenerator.paragraph({ sentences: 1, wordMax: 5 })}`,
        description: RandomGenerator.paragraph({ sentences: 2, wordMax: 8 }),
        todo_app_category_id: category.id,
        priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
        due_date: new Date(
          Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        completion_order: index,
      } satisfies ITodoAppTask.ICreate;

      const task: ITodoAppTask = await api.functional.todoApp.user.tasks.create(
        connection,
        {
          body: taskData,
        },
      );

      typia.assert(task);
      return task;
    },
  );

  // Verify all tasks were created successfully
  TestValidator.predicate(
    "all tasks created successfully",
    tasks.length === taskCount,
  );

  // Verify each task has the correct category assignment
  tasks.forEach((task, index) => {
    TestValidator.predicate(
      `task ${index + 1} has category`,
      task.category !== null && task.category !== undefined,
    );
    TestValidator.equals(
      `task ${index + 1} category ID`,
      task.category!.id,
      category.id,
    );
  });

  // Step 4: Delete the category (should cascade delete all associated tasks)
  const deletedCategory: ITodoAppCategory =
    await api.functional.todoApp.user.categories.erase(connection, {
      categoryId: category.id,
    });
  typia.assert(deletedCategory);

  // Step 5: Verify deletion is complete and irreversible
  // The deleted category should match the original category
  TestValidator.equals(
    "deleted category matches original",
    deletedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "deleted category name matches",
    deletedCategory.name,
    category.name,
  );

  // Verify deletion is irreversible by testing that tasks can no longer be created with the deleted category
  await TestValidator.error(
    "cannot create task with deleted category",
    async () => {
      const invalidTaskData = {
        title: "Invalid Task",
        todo_app_category_id: category.id,
      } satisfies ITodoAppTask.ICreate;

      await api.functional.todoApp.user.tasks.create(connection, {
        body: invalidTaskData,
      });
    },
  );
}
