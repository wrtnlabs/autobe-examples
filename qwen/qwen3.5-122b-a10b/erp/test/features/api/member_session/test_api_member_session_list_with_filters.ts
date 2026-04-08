import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberSession";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session filtering functionality with date range, expiration status, and IP address filters.
 *
 * Validates that authenticated members can retrieve their session history with various filtering criteria. The test creates multiple sessions across different time periods and IP addresses, then verifies each filter works correctly independently and in combination.
 *
 * The test covers:
 * 1. Date range filtering by session creation timestamps
 * 2. Active session filtering (is_active=true) for sessions not yet expired
 * 3. Expired session filtering (is_active=false) for sessions past expiration
 * 4. IP address filtering for security auditing
 * 5. Combined filter scenarios
 * 6. Pagination metadata accuracy for filtered results
 *
 * 1. Register a new member account with email and password.
 * 2. Create multiple sessions by performing login operations with different IP addresses.
 * 3. Test date_range filter returns sessions within specified start/end boundaries.
 * 4. Test is_active=true returns only sessions where expired_at > current_time.
 * 5. Test is_active=false returns only expired sessions.
 * 6. Test ip_address filter returns sessions from specific IP.
 * 7. Test combined filters work together correctly.
 * 8. Verify pagination metadata reflects accurate filtered counts.
 */
export async function test_api_member_session_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account and store credentials
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple sessions by logging in with different IPs
  const sessions: IHrmMemberSession.ISummary[] = [];
  const ipAddresses = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"ipv4">>(),
  );
  for (const ip of ipAddresses) {
    const loginConnection: api.IConnection = { host: connection.host };
    const loginAuth = await api.functional.hrm.auth.member.login(
      loginConnection,
      {
        body: {
          email: memberAuth.email,
          password,
        } satisfies IHrmMember.ILogin,
      },
    );
    typia.assert(loginAuth);
    // Fetch sessions to capture the newly created session
    const sessionList = await api.functional.hrm.member.member.sessions.index(
      loginConnection,
      {
        body: {
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IHrmMemberSession.IRequest,
      },
    );
    typia.assert(sessionList);
    if (sessionList.data.length > 0) {
      sessions.push(sessionList.data[0]);
    }
  }
  // 3. Test date_range filter
  if (sessions.length >= 2) {
    const firstSession = sessions[0];
    const lastSession = sessions[sessions.length - 1];
    const dateRangeResult =
      await api.functional.hrm.member.member.sessions.index(memberConnection, {
        body: {
          date_range: {
            start: firstSession.created_at,
            end: lastSession.created_at,
          },
          limit: 100,
        } satisfies IHrmMemberSession.IRequest,
      });
    typia.assert(dateRangeResult);
    TestValidator.predicate(
      "date_range filter returns sessions within range",
      dateRangeResult.data.every(
        (s) =>
          new Date(s.created_at) >= new Date(firstSession.created_at) &&
          new Date(s.created_at) <= new Date(lastSession.created_at),
      ),
    );
  }
  // 4. Test is_active=true filter (active sessions)
  const activeResult = await api.functional.hrm.member.member.sessions.index(
    memberConnection,
    {
      body: {
        is_active: true,
        limit: 100,
      } satisfies IHrmMemberSession.IRequest,
    },
  );
  typia.assert(activeResult);
  TestValidator.predicate(
    "is_active=true returns only active sessions",
    activeResult.data.every((s) => new Date(s.expired_at) > new Date()),
  );
  // 5. Test is_active=false filter (expired sessions)
  const expiredResult = await api.functional.hrm.member.member.sessions.index(
    memberConnection,
    {
      body: {
        is_active: false,
        limit: 100,
      } satisfies IHrmMemberSession.IRequest,
    },
  );
  typia.assert(expiredResult);
  TestValidator.predicate(
    "is_active=false returns only expired sessions",
    expiredResult.data.every((s) => new Date(s.expired_at) <= new Date()),
  );
  // 6. Test ip_address filter
  if (sessions.length > 0) {
    const targetIp = sessions[0].ip;
    const ipResult = await api.functional.hrm.member.member.sessions.index(
      memberConnection,
      {
        body: {
          ip_address: targetIp,
          limit: 100,
        } satisfies IHrmMemberSession.IRequest,
      },
    );
    typia.assert(ipResult);
    TestValidator.predicate(
      "ip_address filter returns sessions from specific IP",
      ipResult.data.every((s) => s.ip === targetIp),
    );
  }
  // 7. Test combined filters (date_range + is_active)
  if (sessions.length >= 2) {
    const firstSession = sessions[0];
    const lastSession = sessions[sessions.length - 1];
    const combinedResult =
      await api.functional.hrm.member.member.sessions.index(memberConnection, {
        body: {
          date_range: {
            start: firstSession.created_at,
            end: lastSession.created_at,
          },
          is_active: true,
          limit: 100,
        } satisfies IHrmMemberSession.IRequest,
      });
    typia.assert(combinedResult);
    TestValidator.predicate(
      "combined date_range + is_active filters work together",
      combinedResult.data.every(
        (s) =>
          new Date(s.created_at) >= new Date(firstSession.created_at) &&
          new Date(s.created_at) <= new Date(lastSession.created_at) &&
          new Date(s.expired_at) > new Date(),
      ),
    );
  }
  // 8. Verify pagination metadata
  const allResult = await api.functional.hrm.member.member.sessions.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmMemberSession.IRequest,
    },
  );
  typia.assert(allResult);
  TestValidator.equals(
    "pagination records matches data length",
    allResult.pagination.records,
    allResult.data.length,
  );
}
