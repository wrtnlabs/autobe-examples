import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_member_sessions_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const firstPage: IPageITodoAppMemberSession.ISummary =
    await api.functional.todoApp.guest.sessions.index(memberConnection, {
      body: { page: 1, limit: 1 } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 1);
  TestValidator.predicate(
    "first page data bounded by limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "first page pages is coherent",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page records is coherent",
    firstPage.pagination.records >= firstPage.data.length,
  );
  const repeatedFirstPage: IPageITodoAppMemberSession.ISummary =
    await api.functional.todoApp.guest.sessions.index(memberConnection, {
      body: { page: 1, limit: 1 } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(repeatedFirstPage);
  TestValidator.equals(
    "repeated first page current",
    repeatedFirstPage.pagination.current,
    firstPage.pagination.current,
  );
  TestValidator.equals(
    "repeated first page limit",
    repeatedFirstPage.pagination.limit,
    firstPage.pagination.limit,
  );
  TestValidator.equals(
    "repeated first page records",
    repeatedFirstPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "repeated first page pages",
    repeatedFirstPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals(
    "repeated first page size",
    repeatedFirstPage.data.length,
    firstPage.data.length,
  );
  TestValidator.equals(
    "repeated first page first id",
    repeatedFirstPage.data[0]?.id,
    firstPage.data[0]?.id,
  );
  const secondPage: IPageITodoAppMemberSession.ISummary =
    await api.functional.todoApp.guest.sessions.index(memberConnection, {
      body: { page: 2, limit: 1 } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 1);
  TestValidator.equals(
    "second page records stable",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page pages stable",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.predicate(
    "second page data bounded by limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "page navigation should not duplicate the first item",
      secondPage.data[0].id,
      firstPage.data[0].id,
    );
  }
  const outOfRangePageNumber: number = firstPage.pagination.pages + 1;
  const outOfRangePage: IPageITodoAppMemberSession.ISummary =
    await api.functional.todoApp.guest.sessions.index(memberConnection, {
      body: {
        page: outOfRangePageNumber,
        limit: 1,
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(outOfRangePage);
  TestValidator.equals(
    "out of range current",
    outOfRangePage.pagination.current,
    outOfRangePageNumber,
  );
  TestValidator.equals(
    "out of range limit",
    outOfRangePage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "out of range records",
    outOfRangePage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "out of range pages",
    outOfRangePage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals(
    "out of range data empty",
    outOfRangePage.data.length,
    0,
  );
}
