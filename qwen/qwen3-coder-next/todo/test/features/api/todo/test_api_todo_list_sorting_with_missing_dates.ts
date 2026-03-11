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

export async function test_api_todo_list_sorting_with_missing_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string>() satisfies string as string,
      referrer: typia.random<string>() satisfies string as string,
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // 2. Create todos with various date combinations
  const todos: ITodoAppTodo.ISummary[] = [];
  // Todo 1: Has start date and due date
  todos.push(
    typia.random<ITodoAppTodo.ISummary>() satisfies ITodoAppTodo.ISummary,
  );
  // Todo 2: Has start date only (due date is null)
  todos.push(
    typia.random<ITodoAppTodo.ISummary>() satisfies ITodoAppTodo.ISummary,
  );
  // Todo 3: Has due date only (start date is null)
  todos.push(
    typia.random<ITodoAppTodo.ISummary>() satisfies ITodoAppTodo.ISummary,
  );
  // Todo 4: No dates (both are null)
  todos.push(
    typia.random<ITodoAppTodo.ISummary>() satisfies ITodoAppTodo.ISummary,
  );
  // 3. Test sorting by start_date ascending
  const sortByStartAscResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "startAt",
        direction: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByStartAscResult);
  TestValidator.equals(
    "start date sort ascending",
    sortByStartAscResult.data.length,
    4,
  );
  // 4. Test sorting by start_date descending
  const sortByStartDescResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "startAt",
        direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByStartDescResult);
  TestValidator.equals(
    "start date sort descending",
    sortByStartDescResult.data.length,
    4,
  );
  // 5. Test sorting by due_date ascending
  const sortByDueAscResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: { sort: "dueAt", direction: "asc" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByDueAscResult);
  TestValidator.equals(
    "due date sort ascending",
    sortByDueAscResult.data.length,
    4,
  );
  // 6. Test sorting by due_date descending
  const sortByDueDescResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "dueAt",
        direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByDueDescResult);
  TestValidator.equals(
    "due date sort descending",
    sortByDueDescResult.data.length,
    4,
  );
  // 7. Test sorting by created_at ascending
  const sortByCreatedAscResult =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        sort: "createdAt",
        direction: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortByCreatedAscResult);
  TestValidator.equals(
    "created at sort ascending",
    sortByCreatedAscResult.data.length,
    4,
  );
  // 8. Test sorting by created_at descending
  const sortByCreatedDescResult =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        sort: "createdAt",
        direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortByCreatedDescResult);
  TestValidator.equals(
    "created at sort descending",
    sortByCreatedDescResult.data.length,
    4,
  );
}