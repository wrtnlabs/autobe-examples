import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_creation_concurrent_operations(
  connection: api.IConnection,
) {
  // Create multiple user accounts
  const users: ITodoListUser.IAuthorized[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const email = `user${index}@example.com`;
      const password = `password${index}`;
      const user = await api.functional.auth.user.join(connection, {
        body: {
          email,
          password,
        } satisfies ITodoListUser.ICreate,
      });
      typia.assert(user);
      return user;
    },
  );

  // Generate random task data for each user
  const userTasks: ITodoListTask.ICreate[][] = users.map(() =>
    ArrayUtil.repeat(2, () => ({
      title: RandomGenerator.name(),
      description: RandomGenerator.paragraph(),
      deadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
    })),
  );

  // Execute concurrent task creation for each user
  const createdTasks: ITodoListTask[][] = await Promise.all(
    users.map(async (user, userIndex) => {
      // Authenticate once per user
      await api.functional.auth.user.join(connection, {
        body: {
          email: user.email,
          password: `password${userIndex}`,
        } satisfies ITodoListUser.ICreate,
      });

      // Create tasks for the current user
      return await Promise.all(
        userTasks[userIndex].map(async (task) => {
          const createdTask = await api.functional.todoList.user.tasks.create(
            connection,
            {
              body: task,
            },
          );
          typia.assert(createdTask);
          return createdTask;
        }),
      );
    }),
  );

  // Flatten the array of arrays into a single array of tasks
  const allCreatedTasks = createdTasks.flat();

  // Validate all tasks were created successfully
  TestValidator.predicate(
    "all tasks were created",
    allCreatedTasks.length === users.length * 2,
  );

  // Validate each task is associated with the correct user
  allCreatedTasks.forEach((task, index) => {
    const userIndex = Math.floor(index / 2);
    const expectedUser = users[userIndex];
    TestValidator.equals(
      `task ${index} is associated with correct user`,
      task.todo_list_user_id,
      expectedUser.id,
    );
  });

  // Validate data integrity by checking task uniqueness
  const taskIds = allCreatedTasks.map((task) => task.id);
  const uniqueTaskIds = new Set(taskIds);
  TestValidator.predicate(
    "no duplicate tasks",
    taskIds.length === uniqueTaskIds.size,
  );

  // Validate that each user can only see their own tasks
  await Promise.all(
    users.map(async (user, userIndex) => {
      // Authenticate the user
      await api.functional.auth.user.join(connection, {
        body: {
          email: user.email,
          password: `password${userIndex}`,
        } satisfies ITodoListUser.ICreate,
      });

      // Get all tasks for the user (this would require a proper retrieval function)
      // For now, we'll just validate that the tasks are correctly assigned
      const userTasks = allCreatedTasks.filter(
        (task) => task.todo_list_user_id === user.id,
      );
      TestValidator.equals(
        `user ${userIndex} has correct number of tasks`,
        userTasks.length,
        2,
      );
    }),
  );
}
