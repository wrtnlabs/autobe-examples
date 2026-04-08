import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session status lifecycle filtering and validation.
 *
 * Validates the session listing API with status-based filtering (active, expired, revoked) and verifies that sessions appear in exactly one status category. Tests multiple member accounts and ensures proper data isolation where members can only query their own sessions.
 *
 * 1. Creates 5 member accounts via join endpoint, each with unique credentials.
 * 2. For each member, queries all sessions without status filter.
 * 3. Queries sessions with status='active' filter and validates.
 * 4. Queries sessions with status='expired' filter and validates.
 * 5. Queries sessions with status='revoked' filter and validates.
 * 6. Verifies no session appears in multiple status filters simultaneously.
 * 7. Verifies union of status-filtered sessions equals all sessions.
 * 8. Validates each session's member_id matches the authenticated member.
 * 9. Validates pagination fields are properly populated with valid values.
 */
export async function test_api_member_session_status_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  const members: IRedditPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 5; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: `member${i}@test.com`,
        password: RandomGenerator.alphaNumeric(16),
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: `https://example.com/page${i}`,
        referrer: `https://referrer${i}.com`,
        ip: `192.168.1.${100 + i}`,
      },
    });
    typia.assert(member);
    members.push(member);
  }
  const allSessions: IRedditPlatformMemberSession.ISummary[] = [];
  const activeSessions: IRedditPlatformMemberSession.ISummary[] = [];
  const expiredSessions: IRedditPlatformMemberSession.ISummary[] = [];
  const revokedSessions: IRedditPlatformMemberSession.ISummary[] = [];
  let lastAllResponse: IPageIRedditPlatformMemberSession.ISummary | undefined;
  for (let i = 0; i < members.length; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    memberConnection.headers = { Authorization: members[i].token.access };
    const allResponse =
      await api.functional.redditPlatform.member.sessions.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 100,
          },
        },
      );
    typia.assert(allResponse);
    lastAllResponse = allResponse;
    allSessions.push(...allResponse.data);
    const activeResponse =
      await api.functional.redditPlatform.member.sessions.index(
        memberConnection,
        {
          body: {
            status: "active",
            page: 1,
            limit: 100,
          },
        },
      );
    typia.assert(activeResponse);
    activeSessions.push(...activeResponse.data);
    const expiredResponse =
      await api.functional.redditPlatform.member.sessions.index(
        memberConnection,
        {
          body: {
            status: "expired",
            page: 1,
            limit: 100,
          },
        },
      );
    typia.assert(expiredResponse);
    expiredSessions.push(...expiredResponse.data);
    const revokedResponse =
      await api.functional.redditPlatform.member.sessions.index(
        memberConnection,
        {
          body: {
            status: "revoked",
            page: 1,
            limit: 100,
          },
        },
      );
    typia.assert(revokedResponse);
    revokedSessions.push(...revokedResponse.data);
    for (const session of allResponse.data) {
      TestValidator.equals(
        "session member matches authenticated member",
        session.member.id,
        members[i].id,
      );
    }
  }
  TestValidator.equals(
    "no overlap between active and expired sessions",
    activeSessions.filter((a) => expiredSessions.some((e) => e.id === a.id))
      .length,
    0,
  );
  TestValidator.equals(
    "no overlap between active and revoked sessions",
    activeSessions.filter((a) => revokedSessions.some((r) => r.id === a.id))
      .length,
    0,
  );
  TestValidator.equals(
    "no overlap between expired and revoked sessions",
    expiredSessions.filter((e) => revokedSessions.some((r) => r.id === e.id))
      .length,
    0,
  );
  const unionCount =
    activeSessions.length + expiredSessions.length + revokedSessions.length;
  TestValidator.equals(
    "union of status filters equals all sessions",
    unionCount,
    allSessions.length,
  );
  TestValidator.predicate("all responses have valid pagination", () => {
    if (!lastAllResponse) return false;
    return (
      lastAllResponse.pagination.records >= 0 &&
      lastAllResponse.pagination.pages >= 0 &&
      lastAllResponse.pagination.limit > 0 &&
      lastAllResponse.pagination.current > 0
    );
  });
}
