import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_history_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test filtering with date range - no filters (get all)
  const allHistories =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(allHistories);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    allHistories.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allHistories.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    allHistories.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allHistories.pagination.pages >= 0,
  );
  // 3. Test filtering with changed_at_from only
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7); // 7 days ago
  const fromFilterHistories =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          changed_at_from: fromDate.toISOString(),
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(fromFilterHistories);
  // 4. Test filtering with changed_at_to only
  const toDate = new Date();
  toDate.setDate(toDate.getDate() - 1); // 1 day ago
  const toFilterHistories =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          changed_at_to: toDate.toISOString(),
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(toFilterHistories);
  // 5. Test filtering with both changed_at_from and changed_at_to
  const rangeHistories =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          changed_at_from: fromDate.toISOString(),
          changed_at_to: toDate.toISOString(),
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(rangeHistories);
  // 6. Test edge case: future date range (should return empty results)
  const futureFrom = new Date();
  futureFrom.setDate(futureFrom.getDate() + 30); // 30 days in future
  const futureHistories =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          changed_at_from: futureFrom.toISOString(),
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(futureHistories);
  TestValidator.predicate(
    "future range returns empty results",
    futureHistories.data.length === 0 &&
      futureHistories.pagination.records === 0,
  );
  // 7. Test edge case: very narrow date range
  const narrowFrom = new Date();
  const narrowTo = new Date(narrowFrom.getTime() + 1000); // 1 second later
  const narrowHistories =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          changed_at_from: narrowFrom.toISOString(),
          changed_at_to: narrowTo.toISOString(),
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(narrowHistories);
  // 8. Validate that when history exists, data structure is consistent
  if (allHistories.data.length > 0) {
    TestValidator.predicate(
      "history data array matches pagination records",
      allHistories.data.length <= allHistories.pagination.records,
    );
  }
}
