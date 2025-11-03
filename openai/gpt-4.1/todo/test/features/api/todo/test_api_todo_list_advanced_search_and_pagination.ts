import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Test advanced searching, filtering, sorting, and paginated retrieval of todos
 * strictly belonging to the authenticated user.
 *
 * Scenario:
 *
 * 1. Register todoUser (A) and create a diverse set of todos for them.
 * 2. Validate pagination returns only A's todos, no more than limit per page,
 *    metadata is accurate.
 * 3. Test free-text search using a unique title keyword present in one todo only;
 *    verify only matching todo(s) are returned.
 * 4. Test filtering by is_completed: fetch all todos, pick a value present, query
 *    and assert all results match.
 * 5. Date filtering: fetch all todos, derive a date range, query for a window and
 *    check only valid todos exist in result.
 * 6. Sorting: request sort by title (asc/desc) and created_at (asc/desc); assert
 *    correct order by field.
 * 7. Register second todoUser (B) and create todos for B; verify that
 *    index/search/filter queries from B never leak A's todos.
 */
export async function test_api_todo_list_advanced_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate first user (A)
  const emailA = typia.random<string & tags.Format<"email">>();
  const passwordA = RandomGenerator.alphaNumeric(12);
  const userA = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      ip: null,
      href: "http://localhost/register",
      referrer: "http://localhost/landing",
    } satisfies ITodoListTodouser.IVerifyJoin,
  });
  typia.assert(userA);

  // 2. Create 21 todos for user A with controlled diversity in titles
  const baseTitle = RandomGenerator.paragraph({ sentences: 3 });
  const uniqueKeyword = "UNIQUESEARCHKEY";
  // Put the unique keyword in only one todo for clean search test
  const todosA: ITodoListTodo[] = [];
  for (let i = 0; i < 21; ++i) {
    const title =
      i === 11 ? `${baseTitle} ${uniqueKeyword}` : `${baseTitle} (${i})`;
    const description = RandomGenerator.paragraph({ sentences: 5 });
    const todo = await api.functional.todoList.todoUser.todos.create(
      connection,
      {
        body: { title, description } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(todo);
    todosA.push(todo);
  }

  // 3. Pagination: verify first and second page
  const page1 = await api.functional.todoList.todoUser.todos.index(connection, {
    body: { page: 1, limit: 10 } satisfies ITodoListTodo.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("pagination: first page count", page1.data.length, 10);
  TestValidator.equals("pagination: correct page", page1.pagination.current, 1);
  TestValidator.equals(
    "pagination: correct page size",
    page1.pagination.limit,
    10,
  );

  const page2 = await api.functional.todoList.todoUser.todos.index(connection, {
    body: { page: 2, limit: 10 } satisfies ITodoListTodo.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("pagination: second page count", page2.data.length, 10);
  TestValidator.equals(
    "pagination: correct page 2",
    page2.pagination.current,
    2,
  );
  // Validate no duplication between page1 and page2
  const idsPage1 = page1.data.map((t) => t.id);
  TestValidator.predicate(
    "no overlapping IDs in page1 and page2",
    page2.data.every((t) => !idsPage1.includes(t.id)),
  );

  // 4. Free-text search with unique keyword
  const searchRes = await api.functional.todoList.todoUser.todos.index(
    connection,
    {
      body: { search: uniqueKeyword },
    },
  );
  typia.assert(searchRes);
  TestValidator.equals(
    "search with unique keyword returns 1 todo",
    searchRes.data.length,
    1,
  );
  TestValidator.predicate(
    "all search results contain unique keyword",
    searchRes.data.every((t) => t.title.includes(uniqueKeyword)),
  );

  // 5. is_completed filter (collect value from existing todos)
  const allTodosRes = await api.functional.todoList.todoUser.todos.index(
    connection,
    {
      body: { limit: 50 },
    },
  );
  typia.assert(allTodosRes);
  // If any todos exist, pick a value of is_completed present
  const anyCompleted = allTodosRes.data.find((t) => t.is_completed === true);
  if (anyCompleted) {
    const completedRes = await api.functional.todoList.todoUser.todos.index(
      connection,
      {
        body: { is_completed: true },
      },
    );
    typia.assert(completedRes);
    TestValidator.predicate(
      "all completed filter results are completed",
      completedRes.data.every((t) => t.is_completed === true),
    );
  }
  const anyActive = allTodosRes.data.find((t) => t.is_completed === false);
  if (anyActive) {
    const activeRes = await api.functional.todoList.todoUser.todos.index(
      connection,
      {
        body: { is_completed: false },
      },
    );
    typia.assert(activeRes);
    TestValidator.predicate(
      "all active filter results are not completed",
      activeRes.data.every((t) => t.is_completed === false),
    );
  }

  // 6. Date-window filter (based on actual todos' created_at)
  if (allTodosRes.data.length >= 2) {
    const sortedByCreated = [...allTodosRes.data].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const from =
      sortedByCreated[3]?.created_at ?? sortedByCreated[0].created_at;
    const to =
      sortedByCreated[10]?.created_at ??
      sortedByCreated[sortedByCreated.length - 1].created_at;
    const windowRes = await api.functional.todoList.todoUser.todos.index(
      connection,
      {
        body: { created_from: from, created_to: to },
      },
    );
    typia.assert(windowRes);
    TestValidator.predicate(
      "date-filtered todos within window only",
      windowRes.data.every((t) => t.created_at >= from && t.created_at <= to),
    );
  }

  // 7. Sorting validation
  // title ascending
  const sortTitleAsc = await api.functional.todoList.todoUser.todos.index(
    connection,
    {
      body: { sort_by: "title", sort_order: "asc", limit: 50 },
    },
  );
  typia.assert(sortTitleAsc);
  TestValidator.predicate(
    "sorted by title ASC",
    sortTitleAsc.data.every(
      (cur, i, arr) => i === 0 || arr[i - 1].title <= cur.title,
    ),
  );
  // title descending
  const sortTitleDesc = await api.functional.todoList.todoUser.todos.index(
    connection,
    {
      body: { sort_by: "title", sort_order: "desc", limit: 50 },
    },
  );
  typia.assert(sortTitleDesc);
  TestValidator.predicate(
    "sorted by title DESC",
    sortTitleDesc.data.every(
      (cur, i, arr) => i === 0 || arr[i - 1].title >= cur.title,
    ),
  );
  // created_at descending
  const sortCreatedDesc = await api.functional.todoList.todoUser.todos.index(
    connection,
    {
      body: { sort_by: "created_at", sort_order: "desc", limit: 50 },
    },
  );
  typia.assert(sortCreatedDesc);
  TestValidator.predicate(
    "sorted by created_at DESC",
    sortCreatedDesc.data.every(
      (cur, i, arr) => i === 0 || arr[i - 1].created_at >= cur.created_at,
    ),
  );
  // created_at ascending
  const sortCreatedAsc = await api.functional.todoList.todoUser.todos.index(
    connection,
    {
      body: { sort_by: "created_at", sort_order: "asc", limit: 50 },
    },
  );
  typia.assert(sortCreatedAsc);
  TestValidator.predicate(
    "sorted by created_at ASC",
    sortCreatedAsc.data.every(
      (cur, i, arr) => i === 0 || arr[i - 1].created_at <= cur.created_at,
    ),
  );

  // 8. Register user B and create todos for B
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = RandomGenerator.alphaNumeric(12);
  const userB = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
      ip: null,
      href: "http://localhost/register",
      referrer: "http://localhost/landing",
    } satisfies ITodoListTodouser.IVerifyJoin,
  });
  typia.assert(userB);
  const todosB: ITodoListTodo[] = [];
  for (let i = 0; i < 3; ++i) {
    const todo = await api.functional.todoList.todoUser.todos.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(todo);
    todosB.push(todo);
  }
  // As user B, searching for A's unique keyword must return zero results
  const searchAsBForA = await api.functional.todoList.todoUser.todos.index(
    connection,
    {
      body: { search: uniqueKeyword },
    },
  );
  typia.assert(searchAsBForA);
  TestValidator.equals(
    "user B search for user A's keyword returns none",
    searchAsBForA.data.length,
    0,
  );
  // As user B, list all and assert all results are B's, never A's
  const resBAll = await api.functional.todoList.todoUser.todos.index(
    connection,
    {
      body: { page: 1, limit: 30 } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(resBAll);
  const todosAIds = todosA.map((t) => t.id);
  TestValidator.predicate(
    "user B cannot see user A's todos",
    resBAll.data.every((t) => !todosAIds.includes(t.id)),
  );
}
