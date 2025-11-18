import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Verify pagination boundary behavior of member user's todo search.
 *
 * Business flow:
 *
 * 1. Join a new member user (POST /auth/memberUser/join), which also authenticates
 *    the connection.
 * 2. Create exactly 15 todos for that member (POST /todoApp/memberUser/todos).
 * 3. Search todos with PATCH /todoApp/memberUser/todos using page/limit only and
 *    validate:
 *
 *    - Page 1 (page=1, limit=10): 10 items, records=15, pages=2
 *    - Page 2 (page=2, limit=10): 5 items, records=15, pages=2
 *    - Page 3 (page=3, limit=10): 0 items, records=15, pages=2, current=3
 * 4. For non-empty pages, all todos must belong to the joined member user.
 */
export async function test_api_member_todo_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const member: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create exactly 15 todos for this member user
  const createdTodos: ITodoAppTodo[] = await ArrayUtil.asyncRepeat(
    15,
    async () => {
      const todoBody = {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies ITodoAppTodo.ICreate;

      const todo: ITodoAppTodo =
        await api.functional.todoApp.memberUser.todos.create(connection, {
          body: todoBody,
        });
      typia.assert(todo);

      // Ensure ownership matches authenticated member
      TestValidator.equals(
        "created todo must belong to joined member user",
        todo.memberUser.id,
        member.id,
      );

      return todo;
    },
  );

  TestValidator.equals(
    "exactly 15 todos should be created for this test",
    createdTodos.length,
    15,
  );

  // Helper to assert pagination metadata
  const assertPagination = (
    title: string,
    pagination: IPage.IPagination,
    expectedCurrent: number,
    expectedLimit: number,
    expectedRecords: number,
    expectedPages: number,
  ): void => {
    TestValidator.equals(
      `${title} - current page`,
      pagination.current,
      expectedCurrent,
    );
    TestValidator.equals(
      `${title} - page limit`,
      pagination.limit,
      expectedLimit,
    );
    TestValidator.equals(
      `${title} - total records`,
      pagination.records,
      expectedRecords,
    );
    TestValidator.equals(
      `${title} - total pages`,
      pagination.pages,
      expectedPages,
    );
  };

  // Helper to assert that all todos in a page belong to current member
  const assertOwnership = (
    title: string,
    data: IPageITodoAppTodo.ISummary["data"],
    memberId: ITodoAppMemberuser.IAuthorized["id"],
  ): void => {
    for (const summary of data) {
      TestValidator.equals(
        `${title} - todo owner must be joined member user`,
        summary.memberUser.id,
        memberId,
      );
    }
  };

  // 3. Page 1, limit 10
  const page1Body = {
    status: null,
    createdFrom: null,
    createdTo: null,
    completed: null,
    search: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: null,
    orderDirection: null,
  } satisfies ITodoAppTodo.IRequest;

  const page1: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: page1Body,
    });
  typia.assert(page1);

  TestValidator.equals("page 1 should return 10 todos", page1.data.length, 10);
  assertPagination("page 1", page1.pagination, 1, 10, 15, 2);
  assertOwnership("page 1", page1.data, member.id);

  // 4. Page 2, limit 10
  const page2Body = {
    status: null,
    createdFrom: null,
    createdTo: null,
    completed: null,
    search: null,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: null,
    orderDirection: null,
  } satisfies ITodoAppTodo.IRequest;

  const page2: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: page2Body,
    });
  typia.assert(page2);

  TestValidator.equals(
    "page 2 should return remaining 5 todos",
    page2.data.length,
    5,
  );
  assertPagination("page 2", page2.pagination, 2, 10, 15, 2);
  assertOwnership("page 2", page2.data, member.id);

  // 5. Page 3, limit 10 (beyond last page)
  const page3Body = {
    status: null,
    createdFrom: null,
    createdTo: null,
    completed: null,
    search: null,
    page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: null,
    orderDirection: null,
  } satisfies ITodoAppTodo.IRequest;

  const page3: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: page3Body,
    });
  typia.assert(page3);

  TestValidator.equals(
    "page 3 should return empty data array when beyond last page",
    page3.data.length,
    0,
  );
  assertPagination("page 3", page3.pagination, 3, 10, 15, 2);
}
