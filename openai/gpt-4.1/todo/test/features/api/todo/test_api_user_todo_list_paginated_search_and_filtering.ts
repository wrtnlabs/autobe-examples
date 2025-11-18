import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate paginated, filtered, and sorted todo list operation for an
 * authenticated user, ensuring only own todos are accessible and
 * pagination/filtering/sorting behave as specified.
 *
 * Steps:
 *
 * 1. Register user and establish authentication session as the test subject.
 * 2. Create a set of todos for the user with varied descriptions, completion
 *    statuses, and created/updated timestamps (simulate history by modifying
 *    timestamps if API supports it).
 * 3. Issue paginated/filtered PATCH requests for: a. Partial description search
 *    (substring in description) b. Filter by is_completed=false c. Date-range
 *    creation filter (created_from, created_to) d. Descending sort by
 *    updated_at e. Combination of the above (e.g., substring AND is_completed
 *    AND date-range) f. Pagination with limit/page and edge case: page with no
 *    results
 * 4. Assert the response contains only the authenticated user's todos with correct
 *    filtering, no leaking of other users' data, correct pagination meta, and
 *    sorted order.
 * 5. Repeat with a second user: create a second account with distinct todos and
 *    confirm original user cannot see these when filtering/paginating their
 *    list.
 */
export async function test_api_user_todo_list_paginated_search_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register first user
  const email1: string = typia.random<string & tags.Format<"email">>();
  const password1: string = RandomGenerator.alphaNumeric(12);
  const joinBody1 = {
    email: email1,
    password: password1,
    href: "https://todo.example.com/register",
    referrer: "https://todo.example.com/",
    ip: undefined,
  } satisfies ITodoUser.IJoin;
  const user1: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody1 },
  );
  typia.assert(user1);

  // 2. Create a variety of todos for this user
  const descriptions = [
    "buy groceries for mom",
    "pay electricity bill",
    "start typescript project",
    "groceries: get apples, bananas, bread",
    "complete e2e testing guide",
    "schedule dentist appointment",
    "write weekly report",
    "organize groceries receipts",
    "fix production bug",
    "groceries shopping with kids",
  ];
  // Create 10 todos in varied order and with varied status (complete/incomplete)
  const createdTodos: ITodoTodo[] = [];
  for (let i = 0; i < descriptions.length; ++i) {
    const todo: ITodoTodo = await api.functional.todo.user.todos.create(
      connection,
      {
        body: {
          description: descriptions[i] as string &
            tags.MinLength<1> &
            tags.MaxLength<255>,
        } satisfies ITodoTodo.ICreate,
      },
    );
    typia.assert(todo);
    // For some, mark as completed by creating a new one (simulate using updated_at and is_completed changes by filtering not API update)
    createdTodos.push(todo);
  }

  // Manually adjust completion: mark 3/10 as completed via direct array mutation for test logic (no API method).
  // We'll simulate that some "virtual" todos are complete by setting their is_completed property for test filtering logic
  createdTodos[2] = {
    ...createdTodos[2],
    is_completed: true,
    completed_at: createdTodos[2].updated_at,
  };
  createdTodos[6] = {
    ...createdTodos[6],
    is_completed: true,
    completed_at: createdTodos[6].updated_at,
  };
  createdTodos[8] = {
    ...createdTodos[8],
    is_completed: true,
    completed_at: createdTodos[8].updated_at,
  };

  // 3. Test description substring filter (search)
  const searchTerm = "groceries";
  const searchTodos = createdTodos.filter((t) =>
    t.description.includes(searchTerm),
  );
  const searchResp = await api.functional.todo.user.todos.index(connection, {
    body: { search: searchTerm } satisfies ITodoTodo.IRequest,
  });
  typia.assert(searchResp);
  // Only this user's todos should be present and all descriptions contain the term
  TestValidator.predicate(
    "all results contain search term and belong to user",
    searchResp.data.every(
      (t) => t.description.includes(searchTerm) && t.user_id === user1.id,
    ),
  );

  // 4. Test completion filtering (is_completed=false)
  const incompleteTodos = createdTodos.filter((t) => !t.is_completed);
  const incompleteResp = await api.functional.todo.user.todos.index(
    connection,
    {
      body: { is_completed: false } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(incompleteResp);
  TestValidator.equals(
    "filtered todos all incomplete, belong to user",
    incompleteResp.data.map((t) => t.user_id),
    incompleteResp.data.map(() => user1.id),
  );
  TestValidator.predicate(
    "all todos are incomplete",
    incompleteResp.data.every((t) => t.is_completed === false),
  );

  // 5. Test created_from/created_to filter using date range: pick window covering 5 of the todos
  const byDate = createdTodos.slice(3, 8);
  const from = byDate[0].created_at;
  const to = byDate[byDate.length - 1].created_at;
  const dateResp = await api.functional.todo.user.todos.index(connection, {
    body: { created_from: from, created_to: to } satisfies ITodoTodo.IRequest,
  });
  typia.assert(dateResp);
  TestValidator.predicate(
    "all todos in date range, belong to user",
    dateResp.data.every(
      (t) =>
        t.created_at >= from && t.created_at <= to && t.user_id === user1.id,
    ),
  );

  // 6. Test sort descending by updated_at
  const sortedTodos = [...createdTodos].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  );
  const sortResp = await api.functional.todo.user.todos.index(connection, {
    body: {
      order_by: "updated_at",
      order_desc: true,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(sortResp);
  const apiSortedIds = sortResp.data.map((t) => t.id);
  const expectedSortedIds = sortedTodos.map((t) => t.id);
  TestValidator.equals(
    "sorted descending by updated_at",
    apiSortedIds.slice(0, sortResp.pagination.limit),
    expectedSortedIds.slice(0, sortResp.pagination.limit),
  );

  // 7. Combination: search + incomplete + date range
  const comboTodos = incompleteTodos.filter(
    (t) =>
      t.description.includes(searchTerm) &&
      t.created_at >= from &&
      t.created_at <= to,
  );
  const comboResp = await api.functional.todo.user.todos.index(connection, {
    body: {
      search: searchTerm,
      is_completed: false,
      created_from: from,
      created_to: to,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(comboResp);
  TestValidator.predicate(
    "combo filter: search, incomplete, date range, correct user only",
    comboResp.data.every(
      (t) =>
        t.description.includes(searchTerm) &&
        !t.is_completed &&
        t.created_at >= from &&
        t.created_at <= to &&
        t.user_id === user1.id,
    ),
  );

  // 8. Pagination and no results
  const limit = 3;
  const pageResp = await api.functional.todo.user.todos.index(connection, {
    body: {
      limit,
      page: 2,
      order_by: "created_at",
      order_desc: true,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(pageResp);
  TestValidator.equals(
    "pagination limit respected",
    pageResp.pagination.limit,
    limit,
  );

  // page too high = no results
  const outsidePageResp = await api.functional.todo.user.todos.index(
    connection,
    {
      body: { limit, page: 1000 } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(outsidePageResp);
  TestValidator.equals(
    "page with no results returns empty data",
    outsidePageResp.data.length,
    0,
  );

  // 9. Cross-user data privacy: register another user and create todos
  const email2: string = typia.random<string & tags.Format<"email">>();
  const password2: string = RandomGenerator.alphaNumeric(12);
  const joinBody2 = {
    email: email2,
    password: password2,
    href: "https://todo.example.com/register",
    referrer: "https://todo.example.com/",
    ip: undefined,
  } satisfies ITodoUser.IJoin;
  const user2: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody2 },
  );
  typia.assert(user2);
  for (let i = 0; i < 2; ++i) {
    const _ = await api.functional.todo.user.todos.create(connection, {
      body: {
        description: `other user todo ${i}` as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
      } satisfies ITodoTodo.ICreate,
    });
    // typia.assert for void return not needed
  }
  // Login back as user1 (original test user)
  await api.functional.auth.user.join(connection, { body: joinBody1 }); // This resets token
  // Confirm none of the second user's todos appear for first user
  const respAfterOther = await api.functional.todo.user.todos.index(
    connection,
    {
      body: {} satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(respAfterOther);
  TestValidator.predicate(
    "no cross-user data leak: all listed todos belong to user1",
    respAfterOther.data.every((t) => t.user_id === user1.id),
  );
}
