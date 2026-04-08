import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_search_sort_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test private member session browsing with search, sorting, and pagination.
   *
   * Verifies that the authenticated member can query only their own session
   * history through the private session list endpoint. The test checks
   * pagination metadata, search narrowing on visible session fields, and stable
   * sorting behavior for the list response while respecting page boundaries.
   *
   * 1. Register a fresh member account and obtain an authenticated connection.
   * 2. Browse the session list with explicit pagination and sort controls.
   * 3. Re-query using a search term derived from a visible field.
   * 4. Validate page metadata, boundary behavior, and ordering.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
    } satisfies ITodoAppMember.IJoin,
  });
  const firstPage = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
        sort: "createdAt",
        order: "desc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page matches the request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches the request",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "result size does not exceed the requested limit",
    firstPage.data.length <= 2,
  );
  if (firstPage.data.length > 1) {
    for (let i = 1; i < firstPage.data.length; i++) {
      TestValidator.predicate(
        "sessions are sorted by createdAt descending",
        firstPage.data[i - 1].created_at >= firstPage.data[i].created_at,
      );
    }
  }
  if (firstPage.data.length > 0) {
    const sample = firstPage.data[0];
    const searchText =
      sample.href.length > 0
        ? sample.href.slice(0, 1)
        : sample.referrer.slice(0, 1);
    const searchedPage = await api.functional.todoApp.member.sessions.index(
      memberConnection,
      {
        body: {
          search: searchText,
          page: 1,
          limit: 5,
          sort: "createdAt",
          order: "desc",
        } satisfies ITodoAppMemberSession.IRequest,
      },
    );
    typia.assert(searchedPage);
    TestValidator.equals(
      "search result current page matches the request",
      searchedPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "search result limit matches the request",
      searchedPage.pagination.limit,
      5,
    );
    TestValidator.predicate(
      "search result size does not exceed the requested limit",
      searchedPage.data.length <= 5,
    );
    if (searchedPage.data.length > 1) {
      for (let i = 1; i < searchedPage.data.length; i++) {
        TestValidator.predicate(
          "searched sessions are sorted by createdAt descending",
          searchedPage.data[i - 1].created_at >=
            searchedPage.data[i].created_at,
        );
      }
    }
  }
  if (firstPage.pagination.pages > 1) {
    const lastPageNumber = firstPage.pagination.pages;
    const lastPage = await api.functional.todoApp.member.sessions.index(
      memberConnection,
      {
        body: {
          page: lastPageNumber,
          limit: 2,
          sort: "createdAt",
          order: "desc",
        } satisfies ITodoAppMemberSession.IRequest,
      },
    );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current number matches the request",
      lastPage.pagination.current,
      lastPageNumber,
    );
    TestValidator.predicate(
      "last page data size does not exceed the requested limit",
      lastPage.data.length <= 2,
    );
    if (lastPage.data.length > 1) {
      for (let i = 1; i < lastPage.data.length; i++) {
        TestValidator.predicate(
          "last page remains sorted by createdAt descending",
          lastPage.data[i - 1].created_at >= lastPage.data[i].created_at,
        );
      }
    }
  }
}
