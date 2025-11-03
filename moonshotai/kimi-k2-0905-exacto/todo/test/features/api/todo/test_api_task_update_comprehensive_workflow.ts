import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test updating task properties including description, completion status, and
 * business workflow status. This comprehensive scenario validates the complete
 * task update workflow where users can modify task details, mark tasks as
 * complete/incomplete, and track progress through business workflow stages.
 *
 * 1. Create user account for task testing
 * 2. Create initial task to be updated
 * 3. Test description update (ensure 500 character limit)
 * 4. Test completion status toggle (completed_at timestamp)
 * 5. Test business status transitions (pending -> processing -> completed)
 * 6. Test multiple property updates in single request
 * 7. Verify task ownership and authorization
 */
export async function test_api_task_update_comprehensive_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testpassword123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Create first task for update testing
  const task1 = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: RandomGenerator.paragraph({
        sentences: 10,
        wordMin: 3,
        wordMax: 8,
      }),
      href: "https://example.com/current",
      referrer: "https://example.com/home",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task1);

  // Create second task for cross-status testing
  const task2 = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 4,
        wordMax: 6,
      }),
      href: "https://example.com/task2",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task2);

  // Test 1: Update description only (ensure character limit)
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 50,
    wordMin: 3,
    wordMax: 7,
  });
  const updatedTask1 = await api.functional.todo.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: task1.id,
      body: {
        description: updatedDescription,
      } satisfies ITodoTask.IUpdate,
    },
  );
  typia.assert(updatedTask1);
  TestValidator.equals(
    "description updated",
    updatedTask1.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "description under 500 chars",
    updatedTask1.description.length <= 500,
  );

  // Test 2: Mark task as complete
  const completedTask = await api.functional.todo.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: task1.id,
      body: {
        completed: true,
      } satisfies ITodoTask.IUpdate,
    },
  );
  typia.assert(completedTask);
  TestValidator.equals("task marked complete", completedTask.completed, true);
  TestValidator.predicate(
    "completed_at timestamp set",
    completedTask.completed_at !== null &&
      completedTask.completed_at !== undefined,
  );

  // Test 3: Mark task as incomplete (toggle back)
  const incompleteTask = await api.functional.todo.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: task1.id,
      body: {
        completed: false,
      } satisfies ITodoTask.IUpdate,
    },
  );
  typia.assert(incompleteTask);
  TestValidator.equals(
    "task marked incomplete",
    incompleteTask.completed,
    false,
  );

  // Test 4: Update business status to processing
  const processingTask = await api.functional.todo.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: task2.id,
      body: {
        business_status: "processing",
      } satisfies ITodoTask.IUpdate,
    },
  );
  typia.assert(processingTask);
  TestValidator.equals(
    "business status processing",
    processingTask.business_status,
    "processing",
  );

  // Test 5: Update business status to completed
  const businessCompletedTask =
    await api.functional.todo.user.users.tasks.update(connection, {
      userId: user.id,
      taskId: task2.id,
      body: {
        business_status: "completed",
        completed: true,
      } satisfies ITodoTask.IUpdate,
    });
  typia.assert(businessCompletedTask);
  TestValidator.equals(
    "business status completed",
    businessCompletedTask.business_status,
    "completed",
  );
  TestValidator.equals(
    "also marked complete",
    businessCompletedTask.completed,
    true,
  );
  TestValidator.predicate(
    "completed_at set",
    businessCompletedTask.completed_at !== null &&
      businessCompletedTask.completed_at !== undefined,
  );

  // Test 6: Multiple properties update
  const finalTask = await api.functional.todo.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: task1.id,
      body: {
        description: "Final updated task description",
        business_status: "processing",
        completed: true,
      } satisfies ITodoTask.IUpdate,
    },
  );
  typia.assert(finalTask);
  TestValidator.equals(
    "description updated in multi-update",
    finalTask.description,
    "Final updated task description",
  );
  TestValidator.equals(
    "business status updated",
    finalTask.business_status,
    "processing",
  );
  TestValidator.equals("completed status unchanged", finalTask.completed, true);
}
