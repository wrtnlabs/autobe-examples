import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication - establish session and obtain access token
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Retrieve session list using authenticated guest connection
  const sessionList = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        direction: "desc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    sessionList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    sessionList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    sessionList.pagination.pages >= 0,
  );
  // Validate pagination consistency
  const expectedPages = Math.ceil(
    sessionList.pagination.records / sessionList.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    sessionList.pagination.pages,
    expectedPages,
  );
  // 4. Validate session data array
  TestValidator.predicate("data is array", Array.isArray(sessionList.data));
  TestValidator.equals(
    "data length matches records",
    sessionList.data.length,
    sessionList.pagination.records,
  );
  // 5. Validate each session summary and isExpired computation logic
  for (const session of sessionList.data) {
    // Validate isExpired computation based on expired_at timestamp
    const expiredAt = new Date(session.expired_at);
    const now = new Date();
    const expectedIsExpired = expiredAt < now;
    TestValidator.equals(
      "isExpired computed correctly",
      session.isExpired,
      expectedIsExpired,
    );
  }
  // 6. Test with different pagination parameters
  const sessionListPage2 = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "expired_at",
        direction: "asc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionListPage2);
  TestValidator.equals(
    "page 2 limit is 10",
    sessionListPage2.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 current page is 1",
    sessionListPage2.pagination.current,
    1,
  );
  // 7. Test empty result handling - query with date range that should return no results
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 10);
  const emptyResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 20,
        created_at_from: farFuture.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
}
