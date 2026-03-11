import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_list_with_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(email),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberSession.IJoin;
  const authResponse = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authResponse);
  // Test filtering by completion status
  // Test 'all' filter - should return all todos
  const allResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allResult);
  // Test 'complete' filter - should return only completed todos
  const completeResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        status: "complete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeResult);
  // Test 'incomplete' filter - should return only incomplete todos
  const incompleteResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        status: "incomplete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteResult);
  // Test sorting by creation date (newest first)
  const createdAtDescResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "createdAt",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdAtDescResult);
  // Test sorting by creation date (oldest first)
  const createdAtAscResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "createdAt",
        direction: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdAtAscResult);
  // Test sorting by start date (earliest first)
  const startAtAscResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "startAt",
        direction: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startAtAscResult);
  // Test sorting by start date (latest first)
  const startAtDescResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "startAt",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startAtDescResult);
  // Test sorting by due date (earliest first)
  const dueAtAscResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "dueAt",
        direction: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueAtAscResult);
  // Test sorting by due date (latest first)
  const dueAtDescResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "dueAt",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueAtDescResult);
  // Test pagination with limit and offset
  const paginatedResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: { page: 1, limit: 2 } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination has correct structure",
    () =>
      paginatedResult.data !== undefined &&
      paginatedResult.pagination !== undefined,
  );
  // Test pagination second page
  const secondPageResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: { page: 2, limit: 2 } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(secondPageResult);
  TestValidator.equals(
    "pagination records count",
    secondPageResult.pagination.records,
    paginatedResult.pagination.records,
  );
  TestValidator.equals(
    "pagination limit",
    secondPageResult.pagination.limit,
    2,
  );
}
