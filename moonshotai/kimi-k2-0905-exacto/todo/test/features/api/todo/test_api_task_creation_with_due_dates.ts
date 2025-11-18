import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_creation_with_due_dates(
  connection: api.IConnection,
) {
  // Test 1: Create user account with proper authentication tracking
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "password123",
      name: RandomGenerator.name(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Test 2: Create task with due date (tomorrow) - using proper date handling
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowsTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3, wordMax: 5 }),
        description: RandomGenerator.paragraph({ sentences: 5, wordMax: 10 }),
        status: "pending",
        priority: "high",
        due_date: tomorrow.toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(tomorrowsTask);
  TestValidator.predicate(
    "tomorrow's task has due date",
    tomorrowsTask.due_date !== null && tomorrowsTask.due_date !== undefined,
  );
  TestValidator.predicate(
    "tomorrow's task due date is within valid range",
    new Date(tomorrowsTask.due_date!).toDateString() ===
      tomorrow.toDateString(),
  );
  TestValidator.equals(
    "tomorrow's task status",
    tomorrowsTask.status,
    "pending",
  );
  TestValidator.equals(
    "tomorrow's task priority",
    tomorrowsTask.priority,
    "high",
  );

  // Test 3: Create task with future due date (30 days from now) - within 5 year limit
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2, wordMax: 5 }),
        description: RandomGenerator.paragraph({ sentences: 4, wordMax: 10 }),
        status: "pending",
        priority: "medium",
        due_date: futureDate.toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(futureTask);
  TestValidator.predicate(
    "future task has due date",
    futureTask.due_date !== null && futureTask.due_date !== undefined,
  );
  TestValidator.predicate(
    "future task due date is within valid range",
    new Date(futureTask.due_date!).toDateString() === futureDate.toDateString(),
  );
  TestValidator.equals("future task status", futureTask.status, "pending");
  TestValidator.equals("future task priority", futureTask.priority, "medium");

  // Test 4: Create task without due date
  const noDueDateTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4, wordMax: 5 }),
        description: RandomGenerator.paragraph({ sentences: 6, wordMax: 10 }),
        status: "pending",
        priority: "low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(noDueDateTask);
  TestValidator.predicate(
    "no due date task has null due_date",
    noDueDateTask.due_date === null,
  );
  TestValidator.equals(
    "no due date task status",
    noDueDateTask.status,
    "pending",
  );
  TestValidator.equals(
    "no due date task priority",
    noDueDateTask.priority,
    "low",
  );

  // Test 5: Create completed task (logical scenario - no future due date)
  const completedTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2, wordMax: 5 }),
        description: RandomGenerator.paragraph({ sentences: 3, wordMax: 10 }),
        status: "completed",
        priority: "none",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask);
  TestValidator.equals(
    "completed task status",
    completedTask.status,
    "completed",
  );
  TestValidator.predicate(
    "completed task has completed_at timestamp",
    completedTask.completed_at !== null &&
      completedTask.completed_at !== undefined,
  );
  TestValidator.predicate(
    "completed task has null due_date",
    completedTask.due_date === null,
  );

  // Test 6: Validate all tasks have correct user ownership
  TestValidator.equals(
    "tomorrow's task user ID",
    tomorrowsTask.user.id,
    user.id,
  );
  TestValidator.equals("future task user ID", futureTask.user.id, user.id);
  TestValidator.equals(
    "no due date task user ID",
    noDueDateTask.user.id,
    user.id,
  );
  TestValidator.equals(
    "completed task user ID",
    completedTask.user.id,
    user.id,
  );

  // Test 7: Validate proper metadata tracking
  TestValidator.predicate(
    "all tasks have creation timestamps",
    tomorrowsTask.created_at !== null && tomorrowsTask.created_at !== undefined,
  );
  TestValidator.predicate(
    "all tasks have update timestamps",
    tomorrowsTask.updated_at !== null && tomorrowsTask.updated_at !== undefined,
  );
  TestValidator.predicate(
    "all task titles are within length limit",
    tomorrowsTask.title.length <= 200 &&
      futureTask.title.length <= 200 &&
      noDueDateTask.title.length <= 200 &&
      completedTask.title.length <= 200,
  );

  // Test 8: Validate due date format (ISO 8601) for tasks with due dates
  if (tomorrowsTask.due_date && futureTask.due_date) {
    TestValidator.predicate(
      "tomorrow's task has valid ISO date format",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        tomorrowsTask.due_date,
      ),
    );
    TestValidator.predicate(
      "future task has valid ISO date format",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        futureTask.due_date,
      ),
    );
  }
}
