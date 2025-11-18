import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with all available fields. User creates fully-featured
 * tasks including title, description, priority, due date, and status. Validates
 * comprehensive task creation workflow, field validation, and complete task
 * data persistence including optional metadata handling.
 */
export async function test_api_task_creation_complete(
  connection: api.IConnection,
) {
  // Step 1: Create user account for task ownership
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePassword123!",
      name: RandomGenerator.name(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create task 1 - Complete task with all fields
  const task1Data = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status: "pending",
    priority: "high",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  } satisfies ITodoAppTask.ICreate;

  const task1 = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: task1Data,
    },
  );
  typia.assert(task1);

  // Validate task 1 creation
  TestValidator.equals("task 1 title matches", task1.title, task1Data.title);
  TestValidator.equals(
    "task 1 description matches",
    task1.description,
    task1Data.description,
  );
  TestValidator.equals("task 1 status matches", task1.status, task1Data.status);
  TestValidator.equals(
    "task 1 priority matches",
    task1.priority,
    task1Data.priority,
  );
  TestValidator.equals(
    "task 1 due date matches",
    task1.due_date,
    task1Data.due_date,
  );
  TestValidator.equals("task 1 user ID matches", task1.user.id, user.id);
  TestValidator.predicate(
    "task 1 has created_at timestamp",
    task1.created_at !== null,
  );
  TestValidator.predicate(
    "task 1 has updated_at timestamp",
    task1.updated_at !== null,
  );
  TestValidator.predicate(
    "task 1 is not completed",
    task1.completed_at === null,
  );

  // Step 3: Create task 2 - Minimal task with required fields only
  const task2Data = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    status: "pending",
  } satisfies ITodoAppTask.ICreate;

  const task2 = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: task2Data,
    },
  );
  typia.assert(task2);

  // Validate task 2 creation (minimal fields)
  TestValidator.equals("task 2 title matches", task2.title, task2Data.title);
  TestValidator.equals("task 2 status matches", task2.status, task2Data.status);
  TestValidator.predicate(
    "task 2 description is null",
    task2.description === null,
  );
  TestValidator.predicate("task 2 priority is null", task2.priority === null);
  TestValidator.predicate("task 2 due_date is null", task2.due_date === null);
  TestValidator.equals("task 2 user ID matches", task2.user.id, user.id);

  // Step 4: Create task 3 - Task with completed status
  const task3Data = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    status: "completed",
    priority: "medium",
  } satisfies ITodoAppTask.ICreate;

  const task3 = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: task3Data,
    },
  );
  typia.assert(task3);

  // Validate task 3 creation (completed status)
  TestValidator.equals("task 3 title matches", task3.title, task3Data.title);
  TestValidator.equals(
    "task 3 description matches",
    task3.description,
    task3Data.description,
  );
  TestValidator.equals("task 3 status matches", task3.status, task3Data.status);
  TestValidator.equals(
    "task 3 priority matches",
    task3.priority,
    task3Data.priority,
  );
  TestValidator.predicate(
    "task 3 has completed_at timestamp",
    task3.completed_at !== null,
  );
  TestValidator.equals("task 3 user ID matches", task3.user.id, user.id);

  // Step 5: Create task 4 - Task with different priority levels
  const priorities = ["none", "low", "medium", "high"] as const;
  const task4Data = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 9 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 7,
    }),
    status: "pending",
    priority: RandomGenerator.pick(priorities),
  } satisfies ITodoAppTask.ICreate;

  const task4 = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: task4Data,
    },
  );
  typia.assert(task4);

  // Validate task 4 creation (random priority)
  TestValidator.equals("task 4 title matches", task4.title, task4Data.title);
  TestValidator.equals(
    "task 4 description matches",
    task4.description,
    task4Data.description,
  );
  TestValidator.equals("task 4 status matches", task4.status, task4Data.status);
  TestValidator.equals(
    "task 4 priority matches",
    task4.priority,
    task4Data.priority,
  );
  TestValidator.equals("task 4 user ID matches", task4.user.id, user.id);

  // Step 6: Validate all tasks share the same user ownership
  TestValidator.equals(
    "task 1 user matches created user",
    task1.user.id,
    user.id,
  );
  TestValidator.equals(
    "task 2 user matches created user",
    task2.user.id,
    user.id,
  );
  TestValidator.equals(
    "task 3 user matches created user",
    task3.user.id,
    user.id,
  );
  TestValidator.equals(
    "task 4 user matches created user",
    task4.user.id,
    user.id,
  );

  // Step 7: Validate task creation timestamps are consistent
  TestValidator.predicate(
    "task 1 created before updated",
    task1.created_at <= task1.updated_at,
  );
  TestValidator.predicate(
    "task 2 created before updated",
    task2.created_at <= task2.updated_at,
  );
  TestValidator.predicate(
    "task 3 created before updated",
    task3.created_at <= task3.updated_at,
  );
  TestValidator.predicate(
    "task 4 created before updated",
    task4.created_at <= task4.updated_at,
  );

  // Step 8: Validate completed tasks have completion timestamp
  TestValidator.predicate(
    "task 3 has completion timestamp",
    task3.completed_at !== null,
  );
  TestValidator.predicate(
    "pending tasks have no completion timestamp",
    task1.completed_at === null &&
      task2.completed_at === null &&
      task4.completed_at === null,
  );

  // Step 9: Validate user summary data consistency across all tasks
  TestValidator.equals(
    "all tasks have same user email",
    task1.user.email === task2.user.email &&
      task2.user.email === task3.user.email &&
      task3.user.email === task4.user.email &&
      task4.user.email === user.email,
    true,
  );
}
