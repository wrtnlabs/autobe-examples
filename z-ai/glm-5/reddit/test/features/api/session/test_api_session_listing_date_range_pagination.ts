import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test date range filtering and pagination for session management.
 *
 * This test verifies:
 * 1. Date range filtering works correctly with created_from and created_to parameters
 * 2. All returned sessions have created_at within the specified range
 * 3. Pagination correctly calculates pages and returns expected records per page
 * 4. IP address partial match filtering works correctly
 */
export async function test_api_session_listing_date_range_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      ip: "192.168.1.100",
    },
  });
  typia.assert(authResult);
  // 2. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const dateRangeResult = await api.functional.community.member.sessions.index(
    memberConnection,
    {
      body: {
        created_from: oneHourAgo.toISOString(),
        created_to: oneHourLater.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // Verify all sessions are within date range
  for (const session of dateRangeResult.data) {
    const createdAt = new Date(session.createdAt);
    TestValidator.predicate(
      "session created_at is within date range",
      createdAt >= oneHourAgo && createdAt <= oneHourLater,
    );
  }
  // 3. Test pagination
  const paginationResult = await api.functional.community.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(paginationResult);
  // Verify pagination metadata
  TestValidator.equals("current page", paginationResult.pagination.current, 1);
  TestValidator.equals("limit", paginationResult.pagination.limit, 5);
  TestValidator.predicate(
    "records count is non-negative",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is calculated correctly",
    paginationResult.pagination.pages ===
      Math.ceil(
        paginationResult.pagination.records / paginationResult.pagination.limit,
      ),
  );
  // Verify data count does not exceed limit
  TestValidator.predicate(
    "data count within limit",
    paginationResult.data.length <= paginationResult.pagination.limit,
  );
  // 4. Test IP partial match filtering
  const ipFilterResult = await api.functional.community.member.sessions.index(
    memberConnection,
    {
      body: {
        ip: "192.168",
        page: 1,
        limit: 10,
      } satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(ipFilterResult);
  // Verify all returned sessions have IP containing the filter string
  for (const session of ipFilterResult.data) {
    TestValidator.predicate(
      "session IP contains filter string",
      session.ip.includes("192.168"),
    );
  }
  // 5. Test empty result for non-matching date range
  const farFuture = new Date("2099-01-01T00:00:00Z");
  const farFutureEnd = new Date("2099-12-31T23:59:59Z");
  const emptyResult = await api.functional.community.member.sessions.index(
    memberConnection,
    {
      body: {
        created_from: farFuture.toISOString(),
        created_to: farFutureEnd.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result for future date range",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for empty result",
    emptyResult.pagination.records,
    0,
  );
}
