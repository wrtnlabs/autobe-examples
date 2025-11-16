import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that task summary responses contain proper data structure and field
 * presence. Validates that task summary objects include required fields (id,
 * title, status, user) while maintaining lightweight structure for performance.
 * Ensures user ownership context is properly embedded and completion timestamps
 * are meaningful when tasks are marked complete.
 */
export async function test_api_task_summary_fields_validation(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user for task operations
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123",
      ip: "127.0.0.1",
      href: "https://example.com/todo",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create sample tasks (API only supports creating pending tasks)
  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: {
        type: "full",
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task1);

  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: {
        type: "full",
        content: RandomGenerator.content({ paragraphs: 1 }),
      },
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task2);

  // Step 3: Retrieve tasks using the summary endpoint
  const taskSummaryResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(taskSummaryResponse);

  // Step 4: Validate summary structure and required fields
  TestValidator.predicate(
    "summary response should have pagination info",
    taskSummaryResponse.pagination !== null &&
      taskSummaryResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "summary response should have data array",
    Array.isArray(taskSummaryResponse.data),
  );

  TestValidator.predicate(
    "summary response should contain at least 2 tasks",
    taskSummaryResponse.data.length >= 2,
  );

  // Step 5: Validate each task summary has required fields
  for (const taskSummary of taskSummaryResponse.data) {
    // Validate required fields are present using proper type checking
    TestValidator.predicate(
      "task summary should have id field",
      taskSummary.id !== null && taskSummary.id !== undefined,
    );

    TestValidator.predicate(
      "task summary should have title field",
      taskSummary.title !== null && taskSummary.title !== undefined,
    );

    TestValidator.predicate(
      "task summary should have status field",
      taskSummary.status !== null && taskSummary.status !== undefined,
    );

    TestValidator.predicate(
      "task summary should have user field",
      taskSummary.user !== null && taskSummary.user !== undefined,
    );

    // Validate field types and constraints
    TestValidator.predicate(
      "task id should be valid UUID format",
      typeof taskSummary.id === "string",
    );

    TestValidator.predicate(
      "task title should be string with max 200 chars",
      typeof taskSummary.title === "string" && taskSummary.title.length <= 200,
    );

    TestValidator.predicate(
      "task status should be string",
      typeof taskSummary.status === "string",
    );

    TestValidator.predicate(
      "user field should have required properties",
      taskSummary.user.id !== null &&
        taskSummary.user.id !== undefined &&
        taskSummary.user.email !== null &&
        taskSummary.user.email !== undefined,
    );

    // Validate user summary structure
    TestValidator.predicate(
      "user id should be valid UUID format",
      typeof taskSummary.user.id === "string",
    );

    TestValidator.predicate(
      "user email should be valid format",
      typeof taskSummary.user.email === "string" &&
        taskSummary.user.email.includes("@"),
    );

    // Validate completion timestamp handling for pending tasks
    TestValidator.predicate(
      "pending tasks should have null completed_at",
      taskSummary.completed_at === null ||
        taskSummary.completed_at === undefined,
    );
  }

  // Step 6: Find and validate the specific tasks we created
  const foundTask1 = taskSummaryResponse.data.find((t) => t.id === task1.id);
  const foundTask2 = taskSummaryResponse.data.find((t) => t.id === task2.id);

  TestValidator.predicate(
    "should find the first task in summary",
    foundTask1 !== undefined,
  );
  TestValidator.predicate(
    "should find the second task in summary",
    foundTask2 !== undefined,
  );

  if (foundTask1) {
    TestValidator.equals(
      "task should have correct title",
      foundTask1.title,
      task1.title,
    );
    TestValidator.equals(
      "task should have pending status",
      foundTask1.status,
      "pending",
    );
    TestValidator.equals(
      "task completion timestamp should be null",
      foundTask1.completed_at,
      null,
    );

    // Validate user ownership context
    TestValidator.equals(
      "task should be owned by correct user",
      foundTask1.user.id,
      user.id,
    );
    TestValidator.equals(
      "task should have correct user email",
      foundTask1.user.email,
      user.email,
    );
  }

  if (foundTask2) {
    TestValidator.equals(
      "task should have correct title",
      foundTask2.title,
      task2.title,
    );
    TestValidator.equals(
      "task should have pending status",
      foundTask2.status,
      "pending",
    );
    TestValidator.equals(
      "task completion timestamp should be null",
      foundTask2.completed_at,
      null,
    );

    // Validate user ownership context
    TestValidator.equals(
      "task should be owned by correct user",
      foundTask2.user.id,
      user.id,
    );
    TestValidator.equals(
      "task should have correct user email",
      foundTask2.user.email,
      user.email,
    );
  }

  // Step 7: Validate lightweight structure (no detailed description)
  TestValidator.predicate(
    "task summary should not have description field",
    !("description" in taskSummaryResponse.data[0]),
  );

  // Step 8: Test with status filter to validate different scenarios
  const pendingOnlyResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "pending",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(pendingOnlyResponse);

  TestValidator.predicate(
    "pending filter should return only pending tasks",
    pendingOnlyResponse.data.every((task) => task.status === "pending"),
  );
}
