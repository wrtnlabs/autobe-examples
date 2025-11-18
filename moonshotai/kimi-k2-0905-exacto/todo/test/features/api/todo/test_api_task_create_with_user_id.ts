import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_create_with_user_id(
  connection: api.IConnection,
) {
  // 1. Create user account for authentication
  const userData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "test1234",
    name: RandomGenerator.name(),
    href: "https://example.com/todo",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.ICreate;

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userData,
    },
  );
  typia.assert(user);

  // 2. Create task with user_id parameter - should be ignored in favor of authenticated user
  const taskByUserId = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        user_id: user.id, // Explicit user_id parameter
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        status: "pending",
        priority: "medium",
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskByUserId);

  // 3. Create task without user_id parameter - baseline comparison
  const taskNormal = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        status: "completed",
        priority: "high",
        due_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskNormal);

  // 4. Validate task properties and user assignment
  TestValidator.predicate(
    "taskByUserId title has valid length",
    taskByUserId.title.length > 0,
  );
  TestValidator.predicate(
    "taskNormal title has valid length",
    taskNormal.title.length > 0,
  );

  TestValidator.predicate(
    "taskByUserId priority is medium",
    taskByUserId.priority === "medium",
  );
  TestValidator.predicate(
    "taskNormal priority is high",
    taskNormal.priority === "high",
  );

  // 5. Validate both tasks belong to the authenticated user (not the user_id parameter)
  TestValidator.equals(
    "taskByUserId user ID matches authenticated user",
    taskByUserId.user.id,
    user.id,
  );
  TestValidator.equals(
    "taskNormal user ID matches authenticated user",
    taskNormal.user.id,
    user.id,
  );

  TestValidator.equals(
    "taskByUserId user email matches authenticated user",
    taskByUserId.user.email,
    user.email,
  );
  TestValidator.equals(
    "taskNormal user email matches authenticated user",
    taskNormal.user.email,
    user.email,
  );

  // 6. Validate task metadata and relationships
  TestValidator.equals(
    "taskByUserId has correct priority",
    taskByUserId.priority,
    "medium",
  );
  TestValidator.equals(
    "taskNormal has correct priority",
    taskNormal.priority,
    "high",
  );

  TestValidator.equals(
    "taskByUserId has correct status",
    taskByUserId.status,
    "pending",
  );
  TestValidator.equals(
    "taskNormal has correct status",
    taskNormal.status,
    "completed",
  );
}
