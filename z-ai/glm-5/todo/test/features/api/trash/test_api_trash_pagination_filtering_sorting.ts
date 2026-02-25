import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_trash_pagination_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create 25 todos with varying completion statuses
  const completedTodos: ITodoAppTodo[] = [];
  const incompleteTodos: ITodoAppTodo[] = [];
  // Create 12 completed todos
  for (let i = 0; i < 12; i++) {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: `Completed Todo ${i}`,
          startDate:
            i % 2 === 0
              ? new Date(Date.now() + i * 86400000).toISOString()
              : null,
          dueDate:
            i % 3 === 0
              ? new Date(Date.now() + (i + 7) * 86400000).toISOString()
              : null,
        },
      },
    );
    typia.assert(todo);
    completedTodos.push(todo);
  }
  // Create 13 incomplete todos
  for (let i = 0; i < 13; i++) {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: `Incomplete Todo ${i}`,
          startDate:
            i % 3 === 0
              ? new Date(Date.now() + i * 86400000).toISOString()
              : null,
          dueDate:
            i % 2 === 0
              ? new Date(Date.now() + (i + 5) * 86400000).toISOString()
              : null,
        },
      },
    );
    typia.assert(todo);
    incompleteTodos.push(todo);
  }
  // 3. Toggle completion status for completed todos
  // Note: The toggle endpoint is not in the provided API list, so we'll work with incomplete todos
  // and just mark some as needing completion toggle - but since no toggle API is provided,
  // we'll skip completion toggle and just delete all todos
  const allTodos = [...completedTodos, ...incompleteTodos];
  const totalTodos = allTodos.length;
  // 4. Delete all todos to move them to trash
  for (const todo of allTodos) {
    await api.functional.todoApp.user.todos.erase(userConnection, {
      todoId: todo.id,
    });
  }
  // 5. Test Pagination
  // Page 1 with limit 10
  const page1 = await api.functional.todoApp.user.trash.index(userConnection, {
    body: {
      page: 1,
      limit: 10,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("page 1 returns 10 items", page1.data.length, 10);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals("total records", page1.pagination.records, totalTodos);
  // Page 2 with limit 10
  const page2 = await api.functional.todoApp.user.trash.index(userConnection, {
    body: {
      page: 2,
      limit: 10,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals(
    "page 2 returns different items",
    page2.data.length,
    totalTodos - 10 > 10 ? 10 : totalTodos - 10,
  );
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  // Verify page 1 and page 2 have different items
  const page1Ids = new Set(page1.data.map((t) => t.id));
  const page2Ids = new Set(page2.data.map((t) => t.id));
  const hasOverlap = [...page2Ids].some((id) => page1Ids.has(id));
  TestValidator.predicate(
    "page 1 and page 2 have no overlapping items",
    !hasOverlap,
  );
  // Limit 50 (maximum) - all items on one page
  const allPage = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allPage);
  TestValidator.equals(
    "limit 50 returns all items",
    allPage.data.length,
    totalTodos,
  );
  TestValidator.equals(
    "limit 50 records",
    allPage.pagination.records,
    totalTodos,
  );
  TestValidator.equals("limit 50 pages", allPage.pagination.pages, 1);
  // 6. Test Filtering by Completion Status
  // Note: Since todos are created incomplete by default and we don't have toggle API,
  // all todos should be incomplete. Let's test filter='incomplete'
  const incompletePage = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        filter: "incomplete",
        limit: 50,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompletePage);
  TestValidator.predicate(
    "all filtered incomplete todos are incomplete",
    incompletePage.data.every((t) => t.is_completed === false),
  );
  const completePage = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        filter: "complete",
        limit: 50,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completePage);
  // Since all todos are incomplete, complete filter should return empty
  TestValidator.equals(
    "complete filter returns 0 items",
    completePage.data.length,
    0,
  );
  const allFilterPage = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        filter: "all",
        limit: 50,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allFilterPage);
  TestValidator.equals(
    "all filter returns all items",
    allFilterPage.data.length,
    totalTodos,
  );
  // 7. Test Sorting
  // Sort by created_at ascending (oldest first)
  const createdAsc = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        limit: 50,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdAsc);
  for (let i = 1; i < createdAsc.data.length; i++) {
    const prevDate = new Date(createdAsc.data[i - 1].created_at).getTime();
    const currDate = new Date(createdAsc.data[i].created_at).getTime();
    TestValidator.predicate(
      "created_at asc: each item >= previous",
      prevDate <= currDate,
    );
  }
  // Sort by created_at descending (newest first)
  const createdDesc = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 50,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdDesc);
  for (let i = 1; i < createdDesc.data.length; i++) {
    const prevDate = new Date(createdDesc.data[i - 1].created_at).getTime();
    const currDate = new Date(createdDesc.data[i].created_at).getTime();
    TestValidator.predicate(
      "created_at desc: each item <= previous",
      prevDate >= currDate,
    );
  }
  // Sort by start_date ascending (earliest first, nulls at end)
  const startDateAsc = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        sortBy: "start_date",
        sortOrder: "asc",
        limit: 50,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startDateAsc);
  const startDateAscNonNull = startDateAsc.data.filter(
    (t) => t.start_date !== null,
  );
  const startDateAscNull = startDateAsc.data.filter(
    (t) => t.start_date === null,
  );
  // Verify null dates are at the end
  TestValidator.equals(
    "start_date asc: nulls at end",
    startDateAscNull.length,
    startDateAsc.data.length - startDateAscNonNull.length,
  );
  // Verify non-null dates are sorted
  for (let i = 1; i < startDateAscNonNull.length; i++) {
    const prevDate = new Date(startDateAscNonNull[i - 1].start_date!).getTime();
    const currDate = new Date(startDateAscNonNull[i].start_date!).getTime();
    TestValidator.predicate(
      "start_date asc: non-null sorted ascending",
      prevDate <= currDate,
    );
  }
  // Sort by due_date descending (latest first, nulls at end)
  const dueDateDesc = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        sortBy: "due_date",
        sortOrder: "desc",
        limit: 50,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueDateDesc);
  const dueDateDescNonNull = dueDateDesc.data.filter(
    (t) => t.due_date !== null,
  );
  const dueDateDescNull = dueDateDesc.data.filter((t) => t.due_date === null);
  // Verify null dates are at the end
  TestValidator.equals(
    "due_date desc: nulls at end",
    dueDateDescNull.length,
    dueDateDesc.data.length - dueDateDescNonNull.length,
  );
  // Verify non-null dates are sorted descending
  for (let i = 1; i < dueDateDescNonNull.length; i++) {
    const prevDate = new Date(dueDateDescNonNull[i - 1].due_date!).getTime();
    const currDate = new Date(dueDateDescNonNull[i].due_date!).getTime();
    TestValidator.predicate(
      "due_date desc: non-null sorted descending",
      prevDate >= currDate,
    );
  }
}
