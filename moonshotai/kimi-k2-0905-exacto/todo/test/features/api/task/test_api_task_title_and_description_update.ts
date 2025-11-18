import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test complete task update workflow including modification of title and
 * description fields. Validates that users can successfully update existing
 * tasks created through POST /todoApp/user/tasks, modify title text within
 * 200-character limits, update descriptions up to 1000 characters, and verify
 * that changes are persisted with updated timestamps. Ensures the update
 * operation maintains task identity while allowing content modifications.
 *
 * 1. Create a new user account through user registration
 * 2. Create an original task with title and description
 * 3. Update the task title with new content within 200-character limit
 * 4. Update the task description with new content within 1000-character limit
 * 5. Update both title and description simultaneously
 * 6. Verify that updated timestamps are properly set
 * 7. Confirm task identity is maintained throughout updates
 */
export async function test_api_task_title_and_description_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through user registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create an original task with title and description
  const originalTitle = RandomGenerator.paragraph({ sentences: 3, wordMax: 5 });
  const originalDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
  });

  const originalTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
        status: "pending",
        priority: "medium",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(originalTask);

  // Step 3: Update only the task title with new content within 200-character limit
  const newTitle = RandomGenerator.paragraph({ sentences: 4, wordMax: 6 });
  const titleUpdateResult =
    await api.functional.todoApp.user.users.tasks.update(connection, {
      userId: user.id,
      taskId: originalTask.id,
      body: {
        title: newTitle,
      } satisfies ITodoAppTask.IUpdate,
    });
  typia.assert(titleUpdateResult);

  // Verify title was updated while description remained unchanged
  TestValidator.equals("task title updated", titleUpdateResult.title, newTitle);
  TestValidator.equals(
    "task description unchanged",
    titleUpdateResult.description,
    originalDescription,
  );
  TestValidator.predicate(
    "updated timestamp changed",
    titleUpdateResult.updated_at !== originalTask.updated_at,
  );
  TestValidator.equals(
    "task id maintained",
    titleUpdateResult.id,
    originalTask.id,
  );

  // Step 4: Update only the task description with new content within 1000-character limit
  const newDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 4,
    sentenceMax: 6,
  });
  const descUpdateResult = await api.functional.todoApp.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: originalTask.id,
      body: {
        description: newDescription,
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(descUpdateResult);

  // Verify description was updated while title remained from previous update
  TestValidator.equals(
    "task title maintained",
    descUpdateResult.title,
    newTitle,
  );
  TestValidator.equals(
    "task description updated",
    descUpdateResult.description,
    newDescription,
  );
  TestValidator.predicate(
    "updated timestamp changed again",
    descUpdateResult.updated_at !== titleUpdateResult.updated_at,
  );
  TestValidator.equals(
    "task id maintained",
    descUpdateResult.id,
    originalTask.id,
  );

  // Step 5: Update both title and description simultaneously
  const finalTitle = RandomGenerator.paragraph({ sentences: 5, wordMax: 4 });
  const finalDescription = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 2,
    sentenceMax: 4,
  });
  const finalUpdateResult =
    await api.functional.todoApp.user.users.tasks.update(connection, {
      userId: user.id,
      taskId: originalTask.id,
      body: {
        title: finalTitle,
        description: finalDescription,
        status: "completed",
      } satisfies ITodoAppTask.IUpdate,
    });
  typia.assert(finalUpdateResult);

  // Verify both fields were updated and status changed
  TestValidator.equals(
    "final title updated",
    finalUpdateResult.title,
    finalTitle,
  );
  TestValidator.equals(
    "final description updated",
    finalUpdateResult.description,
    finalDescription,
  );
  TestValidator.equals(
    "status updated to completed",
    finalUpdateResult.status,
    "completed",
  );
  TestValidator.predicate(
    "updated timestamp changed again",
    finalUpdateResult.updated_at !== descUpdateResult.updated_at,
  );
  TestValidator.equals(
    "task id maintained",
    finalUpdateResult.id,
    originalTask.id,
  );

  // Step 6: Verify that created_at timestamp remained unchanged while updated_at changed
  TestValidator.equals(
    "created_at timestamp unchanged",
    finalUpdateResult.created_at,
    originalTask.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp is more recent",
    finalUpdateResult.updated_at > originalTask.updated_at,
  );

  // Step 7: Verify task ownership is maintained
  TestValidator.equals(
    "task user id unchanged",
    finalUpdateResult.user.id,
    user.id,
  );
  TestValidator.equals(
    "task user email unchanged",
    finalUpdateResult.user.email,
    user.email,
  );
}
