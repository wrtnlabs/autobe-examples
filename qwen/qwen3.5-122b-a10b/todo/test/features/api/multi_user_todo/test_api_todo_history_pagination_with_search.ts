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

export async function test_api_todo_history_pagination_with_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // 2. Test basic pagination - page 1 with limit 10
  const page1 = await api.functional.multiUserTodo.member.todo_histories.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodoHistory.IRequest,
    },
  );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate("page 1 has records", page1.pagination.records >= 0);
  TestValidator.predicate("page 1 has pages", page1.pagination.pages >= 0);
  // 3. Test pagination - page 2 with limit 10
  const page2 = await api.functional.multiUserTodo.member.todo_histories.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IMultiUserTodoTodoHistory.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // 4. Test different limit values
  const pageLimit20 =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(pageLimit20);
  TestValidator.equals("limit 20", pageLimit20.pagination.limit, 20);
  // 5. Test search functionality - search by partial text
  const searchResult =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: RandomGenerator.alphabets(3),
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search page current",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("search page limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "search has valid pagination",
    searchResult.pagination.pages >= 0,
  );
  // 6. Test search with pagination - page 2
  const searchPage2 =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
          search: RandomGenerator.alphabets(3),
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(searchPage2);
  TestValidator.equals(
    "search page 2 current",
    searchPage2.pagination.current,
    2,
  );
  // 7. Verify response data structure
  if (page1.data.length > 0) {
    const firstEntry = page1.data[0];
    typia.assert(firstEntry);
    TestValidator.predicate("entry has id", firstEntry.id.length > 0);
    TestValidator.predicate(
      "entry has changed_at",
      firstEntry.changed_at.length > 0,
    );
    TestValidator.predicate("entry has member", firstEntry.member !== null);
  }
  // 8. Test empty search (no search parameter)
  const noSearch =
    await api.functional.multiUserTodo.member.todo_histories.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodoHistory.IRequest,
      },
    );
  typia.assert(noSearch);
  TestValidator.equals("no search current", noSearch.pagination.current, 1);
}
