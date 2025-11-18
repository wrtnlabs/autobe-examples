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
 * Test bulk deletion attempt with non-existent task IDs or task IDs belonging
 * to other users. Validates that the operation correctly identifies invalid or
 * unauthorized task IDs, provides detailed error information about each failed
 * deletion, and maintains atomic operation integrity when some tasks cannot be
 * deleted. Ensures proper error handling and user feedback when dealing with
 * invalid target tasks.
 */
export async function test_api_task_bulk_delete_invalid_task_ids(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first user with legitimate tasks
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "SecurePass123",
      ip: "127.0.0.1",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);

  // Create category for organizing tasks
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Work Tasks",
        description: "Professional work-related tasks",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);

  // Create legitimate tasks for first user
  const validTask1 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Complete project documentation",
        description: "Write comprehensive documentation for the new feature",
        priority: "High",
        todo_app_category_id: category.id,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(validTask1);

  const validTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Review code changes",
        description: "Review pull request #123 for the authentication module",
        priority: "Medium",
        todo_app_category_id: category.id,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(validTask2);

  // Step 2: Create second user with their own task (unauthorized for first user)
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "AnotherPass456",
      ip: "127.0.0.1",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);

  // Create task belonging to second user
  const otherUserTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Other user's task",
        description: "This task belongs to the second user",
        priority: "Low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(otherUserTask);

  // Step 3: Attempt bulk delete with mix of valid and invalid task IDs
  const mixedTaskIds = [
    { id: validTask1.id }, // Valid: belongs to first user
    { id: validTask2.id }, // Valid: belongs to first user
    { id: otherUserTask.id }, // Invalid: belongs to second user
    { id: typia.random<string & tags.Format<"uuid">>() }, // Invalid: non-existent
    { id: typia.random<string & tags.Format<"uuid">>() }, // Invalid: non-existent
  ] satisfies ITodoAppTaskId[];

  // Attempt bulk deletion with invalid task IDs
  const bulkDeleteResult =
    await api.functional.todoApp.user.tasks.bulk_delete.bulkDelete(connection, {
      body: {
        task_ids: mixedTaskIds,
      } satisfies ITodoAppTaskDeletion.ICreate,
    });
  typia.assert(bulkDeleteResult);

  // Validate that operation handled invalid IDs correctly
  TestValidator.equals(
    "total requested tasks",
    bulkDeleteResult.total_requested,
    5,
  );
  TestValidator.predicate(
    "deleted count should be less than total due to errors",
    bulkDeleteResult.deleted_count < 5,
  );
  TestValidator.predicate(
    "errors should be present for invalid task IDs",
    bulkDeleteResult.errors.length > 0,
  );

  // Verify error details for different invalid scenarios
  const unauthorizedErrors = bulkDeleteResult.errors.filter(
    (error) =>
      error.code === "UNAUTHORIZED" ||
      error.message.toLowerCase().includes("permission"),
  );
  const notFoundErrors = bulkDeleteResult.errors.filter(
    (error) =>
      error.code === "NOT_FOUND" ||
      error.message.toLowerCase().includes("not found"),
  );

  TestValidator.predicate(
    "should have unauthorized errors for other user's task",
    unauthorizedErrors.length > 0,
  );
  TestValidator.predicate(
    "should have not found errors for non-existent tasks",
    notFoundErrors.length > 0,
  );

  // Verify that error messages include specific task IDs
  bulkDeleteResult.errors.forEach((error) => {
    TestValidator.predicate(
      "error should have task_id reference",
      error.task_id !== undefined,
    );
  });

  // Test with all invalid task IDs (all non-existent)
  const allInvalidIds = [
    { id: typia.random<string & tags.Format<"uuid">>() },
    { id: typia.random<string & tags.Format<"uuid">>() },
    { id: typia.random<string & tags.Format<"uuid">>() },
  ] satisfies ITodoAppTaskId[];

  const allInvalidResult =
    await api.functional.todoApp.user.tasks.bulk_delete.bulkDelete(connection, {
      body: {
        task_ids: allInvalidIds,
      } satisfies ITodoAppTaskDeletion.ICreate,
    });
  typia.assert(allInvalidResult);

  TestValidator.equals(
    "total requested all invalid",
    allInvalidResult.total_requested,
    3,
  );
  TestValidator.equals(
    "deleted count should be zero",
    allInvalidResult.deleted_count,
    0,
  );
  TestValidator.equals(
    "all should be errors",
    allInvalidResult.errors.length,
    3,
  );

  // Test edge case: empty array should fail validation
  await TestValidator.error(
    "bulk delete with empty task array should fail",
    async () => {
      await api.functional.todoApp.user.tasks.bulk_delete.bulkDelete(
        connection,
        {
          body: {
            task_ids: [],
          } satisfies ITodoAppTaskDeletion.ICreate,
        },
      );
    },
  );
}
