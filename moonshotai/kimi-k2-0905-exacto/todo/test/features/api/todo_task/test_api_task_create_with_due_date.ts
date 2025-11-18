import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_create_with_due_date(
  connection: api.IConnection,
) {
  // Step 1: Create a user for due date testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123",
      name: RandomGenerator.name(),
      href: `https://test.example.com/register`,
      referrer: `https://test.example.com`,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a task with immediate due date (today)
  const today = new Date();
  const taskWithImmediateDueDate =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "pending",
        priority: "high",
        due_date: today.toISOString(),
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(taskWithImmediateDueDate);

  TestValidator.predicate(
    "immediate due date task should have due_date",
    taskWithImmediateDueDate.due_date !== null &&
      taskWithImmediateDueDate.due_date !== undefined,
  );
  TestValidator.equals(
    "immediate due date should match",
    taskWithImmediateDueDate.due_date,
    today.toISOString(),
  );

  // Step 3: Create a task with future due date (30 days from now)
  const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  const taskWithFutureDate = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "pending",
        priority: "medium",
        due_date: futureDate.toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskWithFutureDate);

  TestValidator.predicate(
    "future date task should have due_date",
    taskWithFutureDate.due_date !== null &&
      taskWithFutureDate.due_date !== undefined,
  );

  // Step 4: Create a task without due date (validate optional functionality)
  const taskWithoutDueDate = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "pending",
        priority: "low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskWithoutDueDate);

  TestValidator.predicate(
    "task without due date should have null due_date",
    taskWithoutDueDate.due_date === null ||
      taskWithoutDueDate.due_date === undefined,
  );

  // Step 5: Validate date format is ISO 8601
  TestValidator.predicate(
    "due date format should be ISO 8601",
    taskWithImmediateDueDate.due_date?.match(
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i,
    ) !== null &&
      taskWithImmediateDueDate.due_date?.match(
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i,
      ) !== undefined,
  );

  // Step 6: Validate user relationship is maintained
  TestValidator.equals(
    "all tasks should belong to created user",
    user.id,
    taskWithImmediateDueDate.user.id,
  );
  TestValidator.equals(
    "all tasks should belong to created user",
    user.id,
    taskWithFutureDate.user.id,
  );
  TestValidator.equals(
    "all tasks should belong to created user",
    user.id,
    taskWithoutDueDate.user.id,
  );
}
