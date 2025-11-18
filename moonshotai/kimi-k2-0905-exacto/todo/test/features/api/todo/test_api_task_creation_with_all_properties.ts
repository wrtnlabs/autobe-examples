import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test comprehensive task creation using all available properties including
 * title with maximum length limits, detailed descriptions, priority levels,
 * status settings, and future due dates. Validates that the system accepts
 * high-priority tasks with extensive descriptions and due dates set up to 5
 * years in the future. Verifies that all user-provided data is preserved
 * exactly during the creation process with proper server-side validation and
 * metadata assignment.
 */
export async function test_api_task_creation_with_all_properties(
  connection: IConnection,
) {
  // Create user account for authentication
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: `https://example.com/register`,
      referrer: `https://example.com/referral`,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Generate task with maximum title length (200 characters)
  const maxTitle = RandomGenerator.alphabets(200);

  // Create comprehensive description (up to 1000 characters)
  const detailedDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  }).substring(0, 1000);

  // Set due date 5 years in the future
  const futureDueDate = new Date();
  futureDueDate.setFullYear(futureDueDate.getFullYear() + 5);

  // Create high-priority task with all properties
  const comprehensiveTask =
    await api.functional.todoApp.user.users.tasks.create(connection, {
      userId: user.id,
      body: {
        title: maxTitle,
        description: detailedDescription,
        status: "pending",
        priority: "high",
        due_date: futureDueDate.toISOString(),
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(comprehensiveTask);

  // Verify all properties are preserved exactly
  TestValidator.equals(
    "task title matches input exactly",
    comprehensiveTask.title,
    maxTitle,
  );
  TestValidator.equals(
    "task description matches input exactly",
    comprehensiveTask.description,
    detailedDescription,
  );
  TestValidator.equals(
    "task priority matches input",
    comprehensiveTask.priority,
    "high",
  );
  TestValidator.equals(
    "task status matches input",
    comprehensiveTask.status,
    "pending",
  );
  TestValidator.equals(
    "task due date matches input",
    comprehensiveTask.due_date,
    futureDueDate.toISOString(),
  );
  TestValidator.equals(
    "task user matches creator",
    comprehensiveTask.user.id,
    user.id,
  );

  // Test completed status with medium priority
  const completedTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        status: "completed",
        priority: "medium",
        due_date: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days in future
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask);

  TestValidator.equals(
    "completed task has correct status",
    completedTask.status,
    "completed",
  );
  TestValidator.equals(
    "completed task has correct priority",
    completedTask.priority,
    "medium",
  );
  TestValidator.predicate(
    "completed task has completed_at timestamp",
    completedTask.completed_at !== null,
  );

  // Test minimal task with low priority
  const minimalTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: RandomGenerator.alphabets(50),
        status: "pending",
        priority: "low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(minimalTask);

  TestValidator.equals(
    "minimal task has correct priority",
    minimalTask.priority,
    "low",
  );
  TestValidator.equals(
    "minimal task has correct status",
    minimalTask.status,
    "pending",
  );
  TestValidator.equals(
    "minimal task user matches creator",
    minimalTask.user.id,
    user.id,
  );

  // Test task with no priority (should default appropriately)
  const noPriorityTask = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: RandomGenerator.name(),
        description: "Task without priority",
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(noPriorityTask);

  TestValidator.predicate(
    "task without priority should have null/undefined priority",
    noPriorityTask.priority === null || noPriorityTask.priority === undefined,
  );
}
