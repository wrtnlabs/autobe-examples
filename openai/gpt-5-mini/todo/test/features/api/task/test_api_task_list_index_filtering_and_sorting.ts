import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_task_list_index_filtering_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create a new todo user via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUser.ICreate;

  const auth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(auth);

  // 2. Create a private list for this user
  const createListBody = {
    title: `e2e-list-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    {
      body: createListBody,
    },
  );
  typia.assert(list);

  // 3. Create tasks with varied isCompleted and dueDate values
  const now = Date.now();
  const futureISO = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(); // +7 days
  const pastISO = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(); // -7 days

  const completedTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: list.id,
      body: {
        title: "completed task",
        description: "already done",
        isCompleted: true,
        dueDate: null,
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(completedTask);

  const futureTask = await api.functional.todoApp.todoUser.lists.tasks.create(
    connection,
    {
      listId: list.id,
      body: {
        title: "future task",
        description: "due in future",
        isCompleted: false,
        dueDate: futureISO,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(futureTask);

  const pastTask = await api.functional.todoApp.todoUser.lists.tasks.create(
    connection,
    {
      listId: list.id,
      body: {
        title: "past task",
        description: "overdue",
        isCompleted: false,
        dueDate: pastISO,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pastTask);

  // 4. Fetch all tasks for the list (no filters)
  const allPage: IPageITodoAppTask.ISummary =
    await api.functional.todoApp.lists.tasks.index(connection, {
      listId: list.id,
      body: {} satisfies ITodoAppTask.IRequest,
    });
  typia.assert(allPage);
  TestValidator.predicate(
    "index contains created tasks",
    allPage.data.some((t) => t.id === completedTask.id) &&
      allPage.data.some((t) => t.id === futureTask.id) &&
      allPage.data.some((t) => t.id === pastTask.id),
  );

  // 5. Filter: isCompleted = true
  const completedPage: IPageITodoAppTask.ISummary =
    await api.functional.todoApp.lists.tasks.index(connection, {
      listId: list.id,
      body: { isCompleted: true } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(completedPage);
  TestValidator.predicate(
    "isCompleted filter returns only completed tasks and includes created completedTask",
    completedPage.data.every((t) => t.isCompleted === true) &&
      completedPage.data.some((t) => t.id === completedTask.id),
  );

  // 6. Date-range filtering: dueDateAfter should include future task but not past task
  const afterPage: IPageITodoAppTask.ISummary =
    await api.functional.todoApp.lists.tasks.index(connection, {
      listId: list.id,
      body: {
        dueDateAfter: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(afterPage);
  TestValidator.predicate(
    "dueDateAfter includes futureTask and excludes pastTask",
    afterPage.data.some((t) => t.id === futureTask.id) &&
      !afterPage.data.some((t) => t.id === pastTask.id),
  );

  // 7. Date-range filtering: dueDateBefore should include past task
  const beforePage: IPageITodoAppTask.ISummary =
    await api.functional.todoApp.lists.tasks.index(connection, {
      listId: list.id,
      body: {
        dueDateBefore: new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(beforePage);
  TestValidator.predicate(
    "dueDateBefore includes pastTask",
    beforePage.data.some((t) => t.id === pastTask.id),
  );

  // 8. Sorting: sortBy=dueDate&order=desc
  const sortedPage: IPageITodoAppTask.ISummary =
    await api.functional.todoApp.lists.tasks.index(connection, {
      listId: list.id,
      body: {
        sortBy: "dueDate",
        order: "desc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(sortedPage);

  // Extract dated items and assert descending order
  const dated = sortedPage.data
    .map((d) => ({ id: d.id, due: d.dueDate }))
    .filter((d) => d.due !== null && d.due !== undefined)
    .map((d) => ({ id: d.id, due: d.due! }));

  const isDesc = dated.every((v, i, arr) => {
    if (i === 0) return true;
    return new Date(arr[i - 1].due).getTime() >= new Date(v.due).getTime();
  });
  TestValidator.predicate("dueDate sort desc for dated items", isDesc);

  // Additional explicit check: if both futureTask and pastTask are present among dated items,
  // ensure futureTask (later date) appears before pastTask in the sorted results.
  const indexFuture = dated.findIndex((d) => d.id === futureTask.id);
  const indexPast = dated.findIndex((d) => d.id === pastTask.id);
  if (indexFuture !== -1 && indexPast !== -1) {
    TestValidator.predicate(
      "futureTask appears before pastTask in desc order",
      indexFuture < indexPast,
    );
  }

  // 9. Error cases: malformed listId
  await TestValidator.error("malformed listId should cause error", async () => {
    await api.functional.todoApp.lists.tasks.index(connection, {
      listId: "not-a-uuid",
      body: {} satisfies ITodoAppTask.IRequest,
    });
  });

  // 10. Error cases: non-existent listId
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent listId should cause error",
    async () => {
      await api.functional.todoApp.lists.tasks.index(connection, {
        listId: randomId,
        body: {} satisfies ITodoAppTask.IRequest,
      });
    },
  );
}
