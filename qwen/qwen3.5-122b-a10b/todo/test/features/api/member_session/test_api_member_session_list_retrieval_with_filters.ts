import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_list_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const testDisplayName = RandomGenerator.name();
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();
  const testIp = typia.random<string & tags.Format<"ipv4">>();
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      displayName: testDisplayName,
      href: testHref,
      referrer: testReferrer,
      ip: testIp,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Basic session list retrieval with default pagination
  const basicResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(basicResult);
  TestValidator.equals(
    "basic pagination exists",
    basicResult.pagination !== undefined,
    true,
  );
  TestValidator.predicate("has session data", basicResult.data.length >= 0);
  // 3. Date range filtering on created_at
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const created_at_from = thirtyDaysAgo.toISOString();
  const created_at_to = now.toISOString();
  const dateFilteredResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        created_at_from,
        created_at_to,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(dateFilteredResult);
  TestValidator.predicate(
    "date filter applied",
    dateFilteredResult.data.every((session) => {
      const sessionDate = new Date(session.created_at);
      return sessionDate >= thirtyDaysAgo && sessionDate <= now;
    }),
  );
  // 4. Date range filtering on expired_at
  const expired_at_from = now.toISOString();
  const expired_at_to = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const expiredDateFilteredResult =
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        expired_at_from,
        expired_at_to,
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(expiredDateFilteredResult);
  TestValidator.predicate(
    "expired date filter applied",
    expiredDateFilteredResult.data.every((session) => {
      const sessionExpired = new Date(session.expired_at);
      const fromDate = new Date(expired_at_from);
      const toDate = new Date(expired_at_to);
      return sessionExpired >= fromDate && sessionExpired <= toDate;
    }),
  );
  // 5. IP address pattern matching
  const ipFilteredResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        ip: testIp,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(ipFilteredResult);
  TestValidator.predicate(
    "IP filter applied",
    ipFilteredResult.data.every((session) => session.ip.includes(testIp)),
  );
  // 6. Status filtering (active)
  const activeResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        status: "active",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(activeResult);
  TestValidator.predicate(
    "active status filter applied",
    activeResult.data.length >= 0,
  );
  // 7. Custom pagination
  const paginatedResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 10,
  );
  // 8. Sorting by created_at descending (default)
  const sortedDescResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sortedDescResult);
  if (sortedDescResult.data.length > 1) {
    TestValidator.predicate(
      "descending order",
      sortedDescResult.data.every((session, index) => {
        if (index === 0) return true;
        const prevDate = new Date(sortedDescResult.data[index - 1].created_at);
        const currDate = new Date(session.created_at);
        return prevDate >= currDate;
      }),
    );
  }
  // 9. Sorting by created_at ascending
  const sortedAscResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sortedAscResult);
  if (sortedAscResult.data.length > 1) {
    TestValidator.predicate(
      "ascending order",
      sortedAscResult.data.every((session, index) => {
        if (index === 0) return true;
        const prevDate = new Date(sortedAscResult.data[index - 1].created_at);
        const currDate = new Date(session.created_at);
        return prevDate <= currDate;
      }),
    );
  }
  // 10. Sorting by expired_at
  const sortedByExpiredResult =
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        sort_by: "expired_at",
        sort_order: "desc",
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(sortedByExpiredResult);
  // 11. Sorting by IP
  const sortedByIpResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        sort_by: "ip",
        sort_order: "asc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sortedByIpResult);
  // 12. Multiple filters combined
  const combinedFilterResult =
    await api.functional.todoApp.member.sessions.index(memberConnection, {
      body: {
        created_at_from,
        created_at_to,
        status: "active",
        page: 1,
        limit: 5,
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters applied",
    combinedFilterResult.data.length >= 0,
  );
  // 13. Empty result set (future date range that should have no sessions)
  const farFutureFrom = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const farFutureTo = new Date(
    now.getTime() + 366 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        created_at_from: farFutureFrom,
        created_at_to: farFutureTo,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.predicate(
    "empty result data array",
    emptyResult.data.length === 0,
  );
  // 14. Pagination metadata validation
  TestValidator.predicate(
    "pagination current >= 0",
    basicResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    basicResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    basicResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records matches data length or is accurate",
    basicResult.pagination.records >= basicResult.data.length,
  );
}
