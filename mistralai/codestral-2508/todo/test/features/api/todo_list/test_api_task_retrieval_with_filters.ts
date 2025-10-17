import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_task_retrieval_with_filters(
  connection: api.IConnection,
) {
  // 1. Authenticate as a user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "1234",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create tasks to be retrieved and filtered
  const tasks: ITodoListTask[] = await ArrayUtil.asyncRepeat(15, async () => {
    const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          deadline: new Date(
            Date.now() + 86400000 * (Math.random() * 30),
          ).toISOString(),
        } satisfies ITodoListTask.ICreate,
      },
    );
    typia.assert(task);
    return task;
  });

  // 3. Test pagination with different page sizes
  const pageSizes = [5, 10, 15];
  for (const size of pageSizes) {
    const page1: IPageITodoListTask.ISummary =
      await api.functional.todoList.user.tasks.index(connection, {
        body: {
          page: 1,
          limit: size,
        } satisfies ITodoListTask.IRequest,
      });
    typia.assert(page1);
    TestValidator.equals(
      `page 1 with limit ${size} should return ${size} tasks`,
      page1.data.length,
      size,
    );

    if (tasks.length > size) {
      const page2: IPageITodoListTask.ISummary =
        await api.functional.todoList.user.tasks.index(connection, {
          body: {
            page: 2,
            limit: size,
          } satisfies ITodoListTask.IRequest,
        });
      typia.assert(page2);
      TestValidator.equals(
        `page 2 with limit ${size} should return remaining tasks`,
        page2.data.length,
        Math.min(size, tasks.length - size),
      );
    }
  }

  // 4. Test search functionality with different criteria
  const searchTerms = [
    tasks[0].title.substring(0, 3),
    tasks[1].description.substring(0, 5),
    tasks[2].title.substring(0, 4),
    tasks[3].title.substring(0, 2),
    tasks[4].description.substring(0, 3),
  ];

  for (const term of searchTerms) {
    const searchResults: IPageITodoListTask.ISummary =
      await api.functional.todoList.user.tasks.index(connection, {
        body: {
          search: term,
        } satisfies ITodoListTask.IRequest,
      });
    typia.assert(searchResults);
    TestValidator.predicate(
      `search for '${term}' should return results`,
      searchResults.data.length > 0,
    );
    TestValidator.predicate(
      `search results should contain '${term}' in title or description`,
      searchResults.data.every(
        (task) => task.title.includes(term) || task.description.includes(term),
      ),
    );
  }

  // 5. Test deadline filtering
  const futureDeadline = new Date(Date.now() + 86400000 * 30).toISOString();
  const pastDeadline = new Date(Date.now() - 86400000 * 30).toISOString();

  const futureTasks: IPageITodoListTask.ISummary =
    await api.functional.todoList.user.tasks.index(connection, {
      body: {
        deadline: futureDeadline,
      } satisfies ITodoListTask.IRequest,
    });
  typia.assert(futureTasks);
  TestValidator.predicate(
    "future deadline filter should return tasks with future deadlines",
    futureTasks.data.every(
      (task) => task.deadline && task.deadline > futureDeadline,
    ),
  );

  const pastTasks: IPageITodoListTask.ISummary =
    await api.functional.todoList.user.tasks.index(connection, {
      body: {
        deadline: pastDeadline,
      } satisfies ITodoListTask.IRequest,
    });
  typia.assert(pastTasks);
  TestValidator.predicate(
    "past deadline filter should return tasks with past deadlines",
    pastTasks.data.every(
      (task) => task.deadline && task.deadline < pastDeadline,
    ),
  );

  // 6. Test combination of filters and pagination
  const combinedResults: IPageITodoListTask.ISummary =
    await api.functional.todoList.user.tasks.index(connection, {
      body: {
        search: searchTerms[0],
        deadline: futureDeadline,
        page: 1,
        limit: 5,
      } satisfies ITodoListTask.IRequest,
    });
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filter should return matching tasks",
    combinedResults.data.every(
      (task) =>
        task.title.includes(searchTerms[0]) &&
        task.deadline &&
        task.deadline > futureDeadline,
    ),
  );

  // 7. Test edge cases
  // Empty search term
  const emptySearchResults: IPageITodoListTask.ISummary =
    await api.functional.todoList.user.tasks.index(connection, {
      body: {
        search: "",
      } satisfies ITodoListTask.IRequest,
    });
  typia.assert(emptySearchResults);
  TestValidator.equals(
    "empty search should return all tasks",
    emptySearchResults.data.length,
    tasks.length,
  );

  // Invalid deadline
  await TestValidator.error(
    "invalid deadline format should throw error",
    async () => {
      await api.functional.todoList.user.tasks.index(connection, {
        body: {
          deadline: "invalid-date",
        } satisfies ITodoListTask.IRequest,
      });
    },
  );

  // Negative page number
  await TestValidator.error(
    "negative page number should throw error",
    async () => {
      await api.functional.todoList.user.tasks.index(connection, {
        body: {
          page: -1,
        } satisfies ITodoListTask.IRequest,
      });
    },
  );

  // Zero limit
  await TestValidator.error("zero limit should throw error", async () => {
    await api.functional.todoList.user.tasks.index(connection, {
      body: {
        limit: 0,
      } satisfies ITodoListTask.IRequest,
    });
  });
}
