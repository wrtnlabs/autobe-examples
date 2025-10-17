import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_creation_with_various_inputs(
  connection: api.IConnection,
) {
  // Authenticate as a user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Test task creation with valid input
  const validTask: ITodoListTask =
    await api.functional.todoList.user.tasks.create(connection, {
      body: {
        title: "Valid Task",
        description: "This is a valid task description.",
        deadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        priority: "Medium",
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(validTask);
  TestValidator.equals("valid task title", validTask.title, "Valid Task");
  TestValidator.equals(
    "valid task description",
    validTask.description,
    "This is a valid task description.",
  );

  // Test task creation with minimum required input
  const minimalTask: ITodoListTask =
    await api.functional.todoList.user.tasks.create(connection, {
      body: {
        title: "Minimal Task",
        description: "Minimal description",
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(minimalTask);
  TestValidator.equals("minimal task title", minimalTask.title, "Minimal Task");
  TestValidator.equals(
    "minimal task description",
    minimalTask.description,
    "Minimal description",
  );

  // Test task creation with long title and description
  const longTask: ITodoListTask =
    await api.functional.todoList.user.tasks.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 100,
          wordMax: 100,
        }), // Long title
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 50,
          sentenceMax: 50,
        }), // Long description
        priority: "High",
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(longTask);
  TestValidator.predicate(
    "long task title length",
    longTask.title.length <= 100,
  );
  TestValidator.predicate(
    "long task description length",
    longTask.description.length <= 500,
  );

  // Test task creation with past deadline
  const pastDeadlineTask: ITodoListTask =
    await api.functional.todoList.user.tasks.create(connection, {
      body: {
        title: "Past Deadline Task",
        description: "This task has a past deadline.",
        deadline: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(pastDeadlineTask);
  TestValidator.predicate(
    "past deadline task",
    new Date(pastDeadlineTask.deadline!).getTime() < Date.now(),
  );
}
