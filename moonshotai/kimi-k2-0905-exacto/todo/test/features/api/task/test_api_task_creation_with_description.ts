import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with optional detailed description.
 *
 * This test validates the complete task creation workflow for users,
 * specifically focusing on tasks with detailed descriptions. The scenario:
 *
 * 1. Creates a user account through registration
 * 2. Creates a task with both title and comprehensive description
 * 3. Verifies the description field supports up to 1000 characters
 * 4. Validates the structured description format is properly handled
 * 5. Confirms data integrity for both title and description in the response
 *
 * The test ensures users can create comprehensive todo tasks with detailed
 * descriptions while maintaining all data integrity constraints.
 */
export async function test_api_task_creation_with_description(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user account for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "password123",
      ip: "127.0.0.1",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Generate task data with comprehensive description
  const taskTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const descriptionContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  // Step 3: Create task with detailed description
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: taskTitle,
      description: {
        type: "full",
        content: descriptionContent,
      } satisfies ITodoAppTaskDescription.IFull,
    } satisfies ITodoAppTask.ICreate,
  });

  // Step 4: Validate task creation response
  typia.assert(task);

  // Step 5: Verify data integrity
  TestValidator.equals("task title matches input", task.title, taskTitle);
  TestValidator.equals(
    "task description matches input content",
    task.description,
    descriptionContent,
  );
  TestValidator.equals("task status is pending", task.status, "pending");
  TestValidator.predicate(
    "task has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      task.id,
    ),
  );
  TestValidator.equals("task has user reference", task.user.id, user.id);
  TestValidator.equals("task user email matches", task.user.email, user.email);

  // Step 6: Verify description field constraints
  TestValidator.predicate(
    "description length under 1000 characters",
    task.description !== undefined && task.description !== null
      ? task.description.length <= 1000
      : true,
  );

  // Step 7: Verify timestamps are set
  TestValidator.predicate("created_at is set", task.created_at !== null);
  TestValidator.predicate("updated_at is set", task.updated_at !== null);
  TestValidator.predicate(
    "completed_at is null for pending task",
    task.completed_at === null,
  );
}
