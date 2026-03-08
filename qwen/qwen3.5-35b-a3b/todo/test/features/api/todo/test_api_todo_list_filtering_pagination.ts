import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_list_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test completionStatus='complete' filter with limit=3
  // Note: Data may be empty if no todos exist, but API should still handle filtering
  const completedFilterResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 3,
        completionStatus: "complete", // Filter for completed todos only
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedFilterResult);
  // Verify pagination metadata is correct
  TestValidator.equals(
    "completed filter - pagination current",
    completedFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "completed filter - pagination limit",
    completedFilterResult.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "completed filter - data length <= limit",
    completedFilterResult.data.length <= 3,
  );
  TestValidator.predicate(
    "completed filter - records non-negative",
    completedFilterResult.pagination.records >= 0,
  );
  // 3. Test completionStatus='incomplete' filter with limit=4
  const incompleteFilterResult =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        page: 1,
        limit: 4,
        completionStatus: "incomplete", // Filter for incomplete todos only
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompleteFilterResult);
  // Verify pagination metadata is correct
  TestValidator.equals(
    "incomplete filter - pagination current",
    incompleteFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "incomplete filter - pagination limit",
    incompleteFilterResult.pagination.limit,
    4,
  );
  TestValidator.predicate(
    "incomplete filter - data length <= limit",
    incompleteFilterResult.data.length <= 4,
  );
  // 4. Test completionStatus='all' filter with limit=10
  const allFilterResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all", // No filter
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allFilterResult);
  // Verify pagination metadata is correct
  TestValidator.equals(
    "all filter - pagination current",
    allFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "all filter - pagination limit",
    allFilterResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "all filter - data length <= limit",
    allFilterResult.data.length <= 10,
  );
  // 5. Test pagination with filtering (page=2, limit=2 for completed todos)
  const completedPage2Result = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 2,
        completionStatus: "complete",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedPage2Result);
  // Verify pagination metadata is correct
  TestValidator.equals(
    "page 2 - pagination current",
    completedPage2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 - pagination limit",
    completedPage2Result.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page 2 - data length <= limit",
    completedPage2Result.data.length <= 2,
  );
  // 6. Test sorting combined with filtering
  const sortedFilteredResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
        completionStatus: "all",
        sortKey: "createdAt",
        sortOrder: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedFilteredResult);
  // Verify sorting parameters don't cause errors
  TestValidator.equals(
    "sorted filter - pagination current",
    sortedFilteredResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "sorted filter - pagination limit",
    sortedFilteredResult.pagination.limit,
    5,
  );
  // 7. Test that incomplete filter returns only incomplete todos (if any exist)
  if (incompleteFilterResult.data.length > 0) {
    TestValidator.predicate(
      "incomplete filter - all returned todos are incomplete",
      incompleteFilterResult.data.every((t) => t.is_complete === false),
    );
  }
  // 8. Test that completed filter returns only completed todos (if any exist)
  if (completedFilterResult.data.length > 0) {
    TestValidator.predicate(
      "completed filter - all returned todos are complete",
      completedFilterResult.data.every((t) => t.is_complete === true),
    );
  }
}
