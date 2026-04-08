import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_pagination_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guest);
  // 2. Create 25+ sessions by repeatedly refreshing
  const sessionIds: string[] = [];
  const sessionCount = 25;
  let currentGuest = guest;
  for (let i = 0; i < sessionCount; i++) {
    const refreshBody = {
      refresh_token: currentGuest.token.refresh,
    };
    const refreshed = await api.functional.multiUserTodo.auth.guest.refresh(
      { host: connection.host },
      { body: refreshBody },
    );
    typia.assert(refreshed);
    sessionIds.push(refreshed.token.access);
    currentGuest = refreshed;
  }
  // Create connection for subsequent API calls
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${guest.token.access}` },
  };
  // 3. Test pagination with page=1, limit=10
  const page1Body: IMultiUserTodoMemberSession.IRequest = {
    page: 1,
    limit: 10,
  };
  const page1Result = await api.functional.multiUserTodo.guest.sessions.index(
    sessionConnection,
    { body: page1Body },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1: 10 sessions returned",
    page1Result.data.length,
    10,
  );
  TestValidator.equals(
    "page 1: records count",
    page1Result.pagination.records,
    25,
  );
  TestValidator.equals(
    "page 1: total pages >= 3",
    page1Result.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 1: current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1: limit", page1Result.pagination.limit, 10);
  // 4. Test pagination with page=2, limit=10
  const page2Body: IMultiUserTodoMemberSession.IRequest = {
    page: 2,
    limit: 10,
  };
  const page2Result = await api.functional.multiUserTodo.guest.sessions.index(
    sessionConnection,
    { body: page2Body },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2: 10 sessions returned",
    page2Result.data.length,
    10,
  );
  TestValidator.equals(
    "page 2: records count",
    page2Result.pagination.records,
    25,
  );
  TestValidator.equals("page 2: total pages", page2Result.pagination.pages, 3);
  TestValidator.equals(
    "page 2: current page",
    page2Result.pagination.current,
    2,
  );
  // 5. Test pagination with page=3, limit=10
  const page3Body: IMultiUserTodoMemberSession.IRequest = {
    page: 3,
    limit: 10,
  };
  const page3Result = await api.functional.multiUserTodo.guest.sessions.index(
    sessionConnection,
    { body: page3Body },
  );
  typia.assert(page3Result);
  TestValidator.equals(
    "page 3: 5 sessions returned",
    page3Result.data.length,
    5,
  );
  TestValidator.equals(
    "page 3: current page",
    page3Result.pagination.current,
    3,
  );
  // 6. Test pagination beyond total pages
  const page10Body: IMultiUserTodoMemberSession.IRequest = {
    page: 10,
    limit: 10,
  };
  const page10Result = await api.functional.multiUserTodo.guest.sessions.index(
    sessionConnection,
    { body: page10Body },
  );
  typia.assert(page10Result);
  TestValidator.equals(
    "page 10: empty data array",
    page10Result.data.length,
    0,
  );
  TestValidator.equals(
    "page 10: records count",
    page10Result.pagination.records,
    0,
  );
  TestValidator.equals(
    "page 10: total pages",
    page10Result.pagination.pages,
    0,
  );
  // 7. Test sorting: created_at descending (default)
  const sortDescBody: IMultiUserTodoMemberSession.IRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  };
  const sortDescResult =
    await api.functional.multiUserTodo.guest.sessions.index(sessionConnection, {
      body: sortDescBody,
    });
  typia.assert(sortDescResult);
  TestValidator.equals(
    "sort desc: 10 sessions returned",
    sortDescResult.data.length,
    10,
  );
  // Verify sessions are sorted by created_at descending
  for (let i = 1; i < sortDescResult.data.length; i++) {
    const prevCreated = new Date(
      sortDescResult.data[i - 1].created_at,
    ).getTime();
    const currCreated = new Date(sortDescResult.data[i].created_at).getTime();
    TestValidator.predicate(
      `sort desc: session ${i} created after session ${i - 1}`,
      currCreated <= prevCreated,
    );
  }
  // 8. Test sorting: created_at ascending
  const sortAscBody: IMultiUserTodoMemberSession.IRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "asc",
  };
  const sortAscResult = await api.functional.multiUserTodo.guest.sessions.index(
    sessionConnection,
    { body: sortAscBody },
  );
  typia.assert(sortAscResult);
  TestValidator.equals(
    "sort asc: 10 sessions returned",
    sortAscResult.data.length,
    10,
  );
  // Verify sessions are sorted by created_at ascending
  for (let i = 1; i < sortAscResult.data.length; i++) {
    const prevCreated = new Date(
      sortAscResult.data[i - 1].created_at,
    ).getTime();
    const currCreated = new Date(sortDescResult.data[i].created_at).getTime();
    TestValidator.predicate(
      `sort asc: session ${i} created after or equal to session ${i - 1}`,
      currCreated >= prevCreated,
    );
  }
  // 9. Test sorting by IP address
  const sortIpBody: IMultiUserTodoMemberSession.IRequest = {
    page: 1,
    limit: 10,
    sort_by: "ip",
    sort_order: "asc",
  };
  const sortIpResult = await api.functional.multiUserTodo.guest.sessions.index(
    sessionConnection,
    { body: sortIpBody },
  );
  typia.assert(sortIpResult);
  TestValidator.equals(
    "sort by ip: 10 sessions returned",
    sortIpResult.data.length,
    10,
  );
  // 10. Test sorting by expired_at
  const sortExpiredBody: IMultiUserTodoMemberSession.IRequest = {
    page: 1,
    limit: 10,
    sort_by: "expired_at",
    sort_order: "desc",
  };
  const sortExpiredResult =
    await api.functional.multiUserTodo.guest.sessions.index(sessionConnection, {
      body: sortExpiredBody,
    });
  typia.assert(sortExpiredResult);
  TestValidator.equals(
    "sort by expired_at: 10 sessions returned",
    sortExpiredResult.data.length,
    10,
  );
  // 11. Test limit=1
  const limitOneBody: IMultiUserTodoMemberSession.IRequest = {
    page: 1,
    limit: 1,
  };
  const limitOneResult =
    await api.functional.multiUserTodo.guest.sessions.index(sessionConnection, {
      body: limitOneBody,
    });
  typia.assert(limitOneResult);
  TestValidator.equals(
    "limit 1: 1 session returned",
    limitOneResult.data.length,
    1,
  );
  TestValidator.equals(
    "limit 1: pagination limit",
    limitOneResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "limit 1: current page",
    limitOneResult.pagination.current,
    1,
  );
  // 12. Test limit=100 (max)
  const limitHundredBody: IMultiUserTodoMemberSession.IRequest = {
    page: 1,
    limit: 100,
  };
  const limitHundredResult =
    await api.functional.multiUserTodo.guest.sessions.index(sessionConnection, {
      body: limitHundredBody,
    });
  typia.assert(limitHundredResult);
  TestValidator.equals(
    "limit 100: all 25 sessions returned",
    limitHundredResult.data.length,
    25,
  );
  TestValidator.equals(
    "limit 100: pagination limit",
    limitHundredResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "limit 100: current page",
    limitHundredResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 100: total pages",
    limitHundredResult.pagination.pages,
    1,
  );
}