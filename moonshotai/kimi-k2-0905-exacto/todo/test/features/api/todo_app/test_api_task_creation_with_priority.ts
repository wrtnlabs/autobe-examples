import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_creation_with_priority(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test creating task with priority "none"
  const taskNone = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content(),
      status: "pending",
      priority: "none",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(taskNone);
  TestValidator.equals(
    "task with priority none has correct priority",
    taskNone.priority,
    "none",
  );

  // Step 3: Test creating task with priority "low"
  const taskLow = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content(),
      status: "pending",
      priority: "low",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(taskLow);
  TestValidator.equals(
    "task with priority low has correct priority",
    taskLow.priority,
    "low",
  );

  // Step 4: Test creating task with priority "medium"
  const taskMedium = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content(),
        status: "pending",
        priority: "medium",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskMedium);
  TestValidator.equals(
    "task with priority medium has correct priority",
    taskMedium.priority,
    "medium",
  );

  // Step 5: Test creating task with priority "high"
  const taskHigh = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content(),
      status: "pending",
      priority: "high",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(taskHigh);
  TestValidator.equals(
    "task with priority high has correct priority",
    taskHigh.priority,
    "high",
  );

  // Step 6: Test creating task without priority (should default to medium)
  const taskDefault = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content(),
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskDefault);
  TestValidator.equals(
    "task without priority defaults to medium",
    taskDefault.priority,
    "medium",
  );
}
