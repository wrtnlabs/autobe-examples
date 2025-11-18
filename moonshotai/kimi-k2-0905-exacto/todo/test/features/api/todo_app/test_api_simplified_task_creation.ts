import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the simplified task creation workflow through POST /todoApp/user/tasks
 * endpoint. Validates that users can create personal todo items with essential
 * task properties including title with 200-character limits, optional
 * descriptions, priority level assignment, and optional due date configuration.
 * Ensures tasks are automatically associated with the authenticated user and
 * include proper server-side metadata like timestamps and unique identifiers.
 */
export async function test_api_simplified_task_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for task ownership
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "securePassword123",
      href: "https://todo-app.example.com/register",
      referrer: "https://example.com/signup",
      name: RandomGenerator.name(2),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a basic task with minimal required fields
  const basicTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const basicTask = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: basicTitle,
      status: "pending",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(basicTask);

  TestValidator.equals("basic task title matches", basicTask.title, basicTitle);
  TestValidator.equals(
    "basic task status is pending",
    basicTask.status,
    "pending",
  );
  TestValidator.predicate(
    "basic task created_at is set",
    basicTask.created_at !== undefined,
  );
  TestValidator.predicate("basic task id is uuid", basicTask.id !== undefined);
  TestValidator.predicate(
    "basic task user is set",
    basicTask.user !== undefined,
  );

  // Step 3: Create a task with all optional fields (due date, priority, description)
  const fullTask = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 2,
        wordMax: 6,
      }),
      description: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 15,
        sentenceMax: 25,
        wordMin: 4,
        wordMax: 8,
      }),
      status: "completed",
      priority: RandomGenerator.pick([
        "none",
        "low",
        "medium",
        "high",
      ] as const),
      due_date: RandomGenerator.date(
        new Date(Date.now() + 86400000),
        86400000 * 30,
      ).toISOString(),
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(fullTask);

  TestValidator.predicate(
    "full task description is set",
    fullTask.description !== null && fullTask.description !== undefined,
  );
  TestValidator.predicate(
    "full task priority is set",
    fullTask.priority !== null && fullTask.priority !== undefined,
  );
  TestValidator.predicate(
    "full task due_date is set",
    fullTask.due_date !== null && fullTask.due_date !== undefined,
  );
  TestValidator.equals(
    "full task status is completed",
    fullTask.status,
    "completed",
  );
  TestValidator.predicate(
    "full task completed_at is set when status is completed",
    fullTask.completed_at !== undefined,
  );

  // Step 4: Test task with maximum title length (200 characters)
  const maxTitle = RandomGenerator.alphaNumeric(200);
  const longTask = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: maxTitle,
      status: "pending",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(longTask);

  TestValidator.equals(
    "long task title length is 200",
    longTask.title.length,
    200,
  );
  TestValidator.equals(
    "long task title matches input",
    longTask.title,
    maxTitle,
  );

  // Step 5: Test task with null optional fields
  const minimalTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 6,
        }),
        status: "pending",
        description: null,
        priority: null,
        due_date: null,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(minimalTask);

  TestValidator.equals(
    "minimal task description is null",
    minimalTask.description,
    null,
  );
  TestValidator.equals(
    "minimal task priority is null",
    minimalTask.priority,
    null,
  );
  TestValidator.equals(
    "minimal task due_date is null",
    minimalTask.due_date,
    null,
  );

  // Step 6: Verify user association
  TestValidator.equals(
    "task user ID matches authenticated user",
    basicTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "task user email matches",
    basicTask.user.email,
    user.email,
  );
  TestValidator.predicate(
    "all tasks belong to same user",
    fullTask.user.id === user.id &&
      longTask.user.id === user.id &&
      minimalTask.user.id === user.id,
  );
}
