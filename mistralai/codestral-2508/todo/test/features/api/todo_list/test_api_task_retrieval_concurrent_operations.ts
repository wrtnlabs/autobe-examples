import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_retrieval_concurrent_operations(
  connection: api.IConnection,
) {
  // Create multiple users
  const users = await Promise.all(
    ArrayUtil.repeat(5, async () => {
      const email = typia.random<string & tags.Format<"email">>();
      const user = await api.functional.auth.user.join(connection, {
        body: {
          email,
          password: "password123",
        } satisfies ITodoListUser.ICreate,
      });
      typia.assert(user);
      return user;
    }),
  );

  // Create tasks for each user
  const tasks = await Promise.all(
    users.map(async (user) => {
      const task = await api.functional.todoList.user.tasks.create(connection, {
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          deadline: new Date(Date.now() + 86400000).toISOString(),
        } satisfies ITodoListTask.ICreate,
      });
      typia.assert(task);
      return task;
    }),
  );

  // Concurrently retrieve tasks for each user
  const results = await Promise.all(
    users.map(async (user) => {
      const result = await api.functional.todoList.user.tasks.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoListTask.IRequest,
        },
      );
      typia.assert(result);
      return result;
    }),
  );

  // Validate results for each user
  results.forEach((result, index) => {
    TestValidator.equals(
      "pagination information",
      result.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", result.pagination.limit, 10);
    TestValidator.equals("user's tasks retrieved", result.data.length, 1);
    TestValidator.equals(
      "task title matches",
      result.data[0].title,
      tasks[index].title,
    );
    TestValidator.equals(
      "task description matches",
      result.data[0].description,
      tasks[index].description,
    );
    TestValidator.predicate(
      "task deadline is valid",
      result.data[0].deadline !== null && result.data[0].deadline !== undefined,
    );
    TestValidator.predicate(
      "task created_at is valid",
      result.data[0].created_at !== null &&
        result.data[0].created_at !== undefined,
    );
    TestValidator.predicate(
      "task updated_at is valid",
      result.data[0].updated_at !== null &&
        result.data[0].updated_at !== undefined,
    );
  });
}
