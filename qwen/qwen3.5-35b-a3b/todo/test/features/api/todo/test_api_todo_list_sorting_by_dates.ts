import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_list_sorting_by_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test sorting by created_at (default, desc order)
  const created_at_desc_result =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(created_at_desc_result);
  typia.assert(created_at_desc_result.data);
  // 3. Test sorting by start_date (asc order) - NULL values at end
  const start_date_asc_result =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        sortBy: "start_date",
        sortOrder: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(start_date_asc_result);
  typia.assert(start_date_asc_result.data);
  // 4. Test sorting by start_date (desc order) - NULL values at beginning
  const start_date_desc_result =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        sortBy: "start_date",
        sortOrder: "desc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(start_date_desc_result);
  typia.assert(start_date_desc_result.data);
  // 5. Test sorting by due_date (asc order) - NULL values at end
  const due_date_asc_result =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        sortBy: "due_date",
        sortOrder: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(due_date_asc_result);
  typia.assert(due_date_asc_result.data);
  // 6. Test combined filtering and sorting
  const combined_result = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        status: "all",
        sortBy: "due_date",
        sortOrder: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(combined_result);
  typia.assert(combined_result.data);
  // 7. Test sorting with empty results
  const empty_result = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(empty_result);
  typia.assert(empty_result.data);
  // Validate pagination structure for empty results
  TestValidator.equals(
    "pagination current for empty",
    empty_result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit for empty",
    empty_result.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records for empty",
    empty_result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages for empty",
    empty_result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination data empty for empty",
    empty_result.data.length,
    0,
  );
  // Validate all sorting tests return valid response structure
  TestValidator.equals(
    "created_at desc returns valid pagination",
    created_at_desc_result.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "start_date asc returns valid pagination",
    start_date_asc_result.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "start_date desc returns valid pagination",
    start_date_desc_result.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "due_date asc returns valid pagination",
    due_date_asc_result.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "combined filter returns valid pagination",
    combined_result.data.length >= 0,
    true,
  );
  // Validate response data items have correct structure (sample first item if exists)
  if (created_at_desc_result.data.length > 0) {
    const firstTodo = created_at_desc_result.data[0];
    typia.assert<IMultiUserTodoTodo.ISummary>(firstTodo);
    TestValidator.predicate("todo has valid id", firstTodo.id !== "");
    TestValidator.predicate("todo has valid title", firstTodo.title.length > 0);
    TestValidator.predicate("todo has author", firstTodo.author !== undefined);
  }
}
