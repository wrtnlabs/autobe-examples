import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test bulk priority updates across multiple tasks with different priority
 * levels. Create tasks with varying priorities, then use bulk patch to update
 * them all to medium priority. Validate the operation applies priority changes
 * correctly and maintains other task properties. This tests the update_priority
 * action functionality for task organization workflows.
 */
export async function test_api_bulk_task_priority_update_by_user(
  connection: api.IConnection,
) {
  // 1. Create new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "strongPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create high priority task
  const highPriorityTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        status: "pending",
        priority: "high",
        due_date: RandomGenerator.date(
          new Date(),
          30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(highPriorityTask);

  // 3. Create low priority task
  const lowPriorityTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        status: "pending",
        priority: "low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(lowPriorityTask);

  // 4. Create task without priority (will have default medium priority)
  const noPriorityTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(noPriorityTask);

  // Verify initial priority states
  TestValidator.equals(
    "high priority task has correct priority",
    highPriorityTask.priority,
    "high",
  );
  TestValidator.equals(
    "low priority task has correct priority",
    lowPriorityTask.priority,
    "low",
  );
  TestValidator.equals(
    "no priority task has default priority",
    noPriorityTask.priority,
    "medium",
  );

  // 5. Perform bulk priority update to medium
  const bulkResponse = await api.functional.todoApp.user.tasks.bulk.bulkUpdate(
    connection,
    {
      body: {
        task_ids: [highPriorityTask.id, lowPriorityTask.id, noPriorityTask.id],
        action: "update_priority",
        parameters: {
          priority: "medium",
        },
      } satisfies ITodoAppTask.IBulkRequest,
    },
  );
  typia.assert(bulkResponse);

  // Verify bulk operation results
  TestValidator.equals(
    "bulk operation has no errors",
    bulkResponse.has_errors,
    false,
  );
  TestValidator.equals(
    "all tasks updated successfully",
    bulkResponse.success_count,
    3,
  );
  TestValidator.equals("no tasks failed", bulkResponse.failure_count, 0);
  TestValidator.equals("no warnings", bulkResponse.warning_count, 0);
  TestValidator.equals("total count matches", bulkResponse.total_count, 3);

  // Verify individual task results exist
  TestValidator.predicate(
    "bulk response has results array",
    bulkResponse.results.length > 0,
  );
  TestValidator.predicate(
    "high priority task result exists",
    bulkResponse.results[0] !== undefined,
  );
  TestValidator.predicate(
    "low priority task result exists",
    bulkResponse.results[1] !== undefined,
  );
  TestValidator.predicate(
    "no priority task result exists",
    bulkResponse.results[2] !== undefined,
  );

  // Verify task result statuses
  TestValidator.equals(
    "high priority task result status",
    bulkResponse.results[0].status,
    "success",
  );
  TestValidator.equals(
    "low priority task result status",
    bulkResponse.results[1].status,
    "success",
  );
  TestValidator.equals(
    "no priority task result status",
    bulkResponse.results[2].status,
    "success",
  );

  // Verify all tasks now have medium priority and maintain other properties
  const highResult = bulkResponse.results[0];
  const lowResult = bulkResponse.results[1];
  const noneResult = bulkResponse.results[2];

  typia.assert(highResult.task);
  typia.assert(lowResult.task);
  typia.assert(noneResult.task);

  TestValidator.equals(
    "high priority task updated to medium",
    (highResult.task as ITodoAppTask).priority,
    "medium",
  );
  TestValidator.equals(
    "low priority task updated to medium",
    (lowResult.task as ITodoAppTask).priority,
    "medium",
  );
  TestValidator.equals(
    "no priority task remains medium",
    (noneResult.task as ITodoAppTask).priority,
    "medium",
  );

  // Verify other properties are maintained
  TestValidator.equals(
    "high task title maintained",
    (highResult.task as ITodoAppTask).title,
    highPriorityTask.title,
  );
  TestValidator.equals(
    "low task title maintained",
    (lowResult.task as ITodoAppTask).title,
    lowPriorityTask.title,
  );
  TestValidator.equals(
    "none task title maintained",
    (noneResult.task as ITodoAppTask).title,
    noPriorityTask.title,
  );

  TestValidator.equals(
    "high task status maintained",
    (highResult.task as ITodoAppTask).status,
    "pending",
  );
  TestValidator.equals(
    "low task status maintained",
    (lowResult.task as ITodoAppTask).status,
    "pending",
  );
  TestValidator.equals(
    "none task status maintained",
    (noneResult.task as ITodoAppTask).status,
    "pending",
  );

  TestValidator.equals(
    "high task user maintained",
    (highResult.task as ITodoAppTask).user.id,
    user.id,
  );
  TestValidator.equals(
    "low task user maintained",
    (lowResult.task as ITodoAppTask).user.id,
    user.id,
  );
  TestValidator.equals(
    "none task user maintained",
    (noneResult.task as ITodoAppTask).user.id,
    user.id,
  );
}
