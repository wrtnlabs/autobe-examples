import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test modifying a task's title to reflect changing requirements.
 *
 * This test validates the complete task title modification workflow:
 *
 * 1. User registration and authentication
 * 2. Task creation with initial title
 * 3. Title update with validation of constraints
 * 4. Verification of updated_at timestamp changes
 * 5. Testing edge cases with maximum title length
 *
 * The test ensures title modifications work correctly while maintaining data
 * integrity and proper timestamp tracking.
 */
export async function test_api_task_title_modification(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: "https://example.com/register",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create initial task with basic title
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const originalTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: originalTitle,
        description: {
          type: "full",
          content: "Initial task description",
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(originalTask);

  // Store original updated_at timestamp for comparison
  const originalUpdatedAt = originalTask.updated_at;

  // Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Step 3: Update task with more descriptive title
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: originalTask.id,
      body: {
        title: updatedTitle,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  // Step 4: Validate title modification
  TestValidator.equals(
    "title has been updated",
    updatedTask.title,
    updatedTitle,
  );
  TestValidator.notEquals(
    "title is different from original",
    updatedTask.title,
    originalTitle,
  );

  // Step 5: Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedTask.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "newer timestamp",
    new Date(updatedTask.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 6: Test title length constraints - maximum 200 characters
  const maxLengthTitle = RandomGenerator.alphabets(200);
  const longTitleTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: originalTask.id,
      body: {
        title: maxLengthTitle,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(longTitleTask);

  TestValidator.equals(
    "maximum length title accepted",
    longTitleTask.title,
    maxLengthTitle,
  );

  // Step 7: Test minimum title length requirement (1 character minimum)
  const shortTitleTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: originalTask.id,
      body: {
        title: "A",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(shortTitleTask);

  TestValidator.equals(
    "minimum length title accepted",
    shortTitleTask.title,
    "A",
  );

  // Step 8: Test partial update (only title changes, other fields remain)
  const stageTitle = "Complete frontend implementation";
  const titleOnlyUpdate = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: originalTask.id,
      body: {
        title: stageTitle,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(titleOnlyUpdate);

  TestValidator.equals(
    "title updated correctly",
    titleOnlyUpdate.title,
    stageTitle,
  );

  // Verify that description remains if it was present (partial update behavior)
  if (updatedTask.description) {
    TestValidator.equals(
      "description preserved during title-only update",
      titleOnlyUpdate.description,
      updatedTask.description,
    );
  }

  // Step 9: Validate task ownership and structure
  TestValidator.equals(
    "task id remains same",
    titleOnlyUpdate.id,
    originalTask.id,
  );
  TestValidator.equals(
    "user ownership maintained",
    titleOnlyUpdate.user.id,
    user.id,
  );
  TestValidator.equals(
    "status preserved",
    titleOnlyUpdate.status,
    originalTask.status,
  );
}
