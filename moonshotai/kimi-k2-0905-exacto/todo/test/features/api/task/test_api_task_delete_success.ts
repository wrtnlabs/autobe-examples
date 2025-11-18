import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful deletion of a task. Create a task and then delete it to
 * verify the complete task removal workflow. Validates that the task is
 * permanently removed from the system and that ownership validation prevents
 * unauthorized deletion (though this test assumes authorized deletion by the
 * task owner).
 */
export async function test_api_task_delete_success(
  connection: api.IConnection,
) {
  // Register a new user to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "127.0.0.1",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  TestValidator.predicate(
    "user registration successful",
    user.email === userEmail,
  );

  // Create a task to delete
  const createTaskData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    completion_order: 1,
  } satisfies ITodoAppTask.ICreate;

  const createdTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: createTaskData,
    },
  );
  typia.assert(createdTask);
  TestValidator.predicate(
    "task created successfully",
    createdTask.title === createTaskData.title,
  );

  // Delete the task
  await api.functional.todoApp.user.tasks.erase(connection, {
    taskId: createdTask.id,
  });

  // Verify the deletion by checking if the task is removed from the system
  // Since we cannot directly query a deleted task, we can attempt to delete it again to ensure it's gone
  await TestValidator.error("deleted task cannot be found", async () => {
    await api.functional.todoApp.user.tasks.erase(connection, {
      taskId: createdTask.id,
    });
  });

  // Verify that attempting to create another task with the same data works (no conflicts)
  const recreatedTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: createTaskData,
    },
  );
  typia.assert(recreatedTask);
  TestValidator.predicate(
    "task can be recreated with same data",
    recreatedTask.title === createTaskData.title,
  );
  TestValidator.predicate(
    "recreated task has different ID",
    recreatedTask.id !== createdTask.id,
  );
}
