import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_todos_filter_completed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create member-specific connection
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 3. Test status='completed' filter
  const completedFilter =
    await api.functional.multiUserTodoApp.member.todos.index(memberConnection, {
      body: {
        status: "completed",
      } satisfies IMultiUserTodoAppTodo.IRequest,
    });
  typia.assert(completedFilter);
  // Verify response structure
  TestValidator.equals(
    "completed filter - pagination current",
    completedFilter.pagination.current,
    1,
  );
  TestValidator.predicate(
    "completed filter - pagination limit",
    completedFilter.pagination.limit >= 1 &&
      completedFilter.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "completed filter - pagination records",
    completedFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "completed filter - pagination pages",
    completedFilter.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "completed filter - data is array",
    Array.isArray(completedFilter.data),
  );
  // 4. Test status='incomplete' filter
  const incompleteFilter =
    await api.functional.multiUserTodoApp.member.todos.index(memberConnection, {
      body: {
        status: "incomplete",
      } satisfies IMultiUserTodoAppTodo.IRequest,
    });
  typia.assert(incompleteFilter);
  TestValidator.equals(
    "incomplete filter - pagination current",
    incompleteFilter.pagination.current,
    1,
  );
  TestValidator.predicate(
    "incomplete filter - pagination limit",
    incompleteFilter.pagination.limit >= 1 &&
      incompleteFilter.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "incomplete filter - pagination records",
    incompleteFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "incomplete filter - pagination pages",
    incompleteFilter.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "incomplete filter - data is array",
    Array.isArray(incompleteFilter.data),
  );
  // 5. Test status='all' filter
  const allFilter = await api.functional.multiUserTodoApp.member.todos.index(
    memberConnection,
    {
      body: {
        status: "all",
      } satisfies IMultiUserTodoAppTodo.IRequest,
    },
  );
  typia.assert(allFilter);
  TestValidator.equals(
    "all filter - pagination current",
    allFilter.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all filter - pagination limit",
    allFilter.pagination.limit >= 1 && allFilter.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "all filter - pagination records",
    allFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all filter - pagination pages",
    allFilter.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all filter - data is array",
    Array.isArray(allFilter.data),
  );
  // 6. Verify all todos count >= individual filters
  TestValidator.predicate(
    "all filter returns more todos than completed",
    allFilter.pagination.records >= completedFilter.pagination.records,
  );
  TestValidator.predicate(
    "all filter returns more todos than incomplete",
    allFilter.pagination.records >= incompleteFilter.pagination.records,
  );
}
