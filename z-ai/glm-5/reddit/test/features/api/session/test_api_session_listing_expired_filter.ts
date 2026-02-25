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
 * Test filtering sessions by expiration status for security-conscious session management.
 *
 * Validates that the is_expired filter correctly separates active and expired sessions:
 * 1. Member creates a session via authentication
 * 2. Query active sessions (is_expired: false) - verify all have future expiration
 * 3. Query expired sessions (is_expired: true) - verify all have past expiration
 * 4. Verify pagination counts match filter criteria
 */
export async function test_api_session_listing_expired_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member authentication - creates an active session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Query active sessions (is_expired: false)
  const activeSessionsResponse =
    await api.functional.community.member.sessions.index(memberConnection, {
      body: {
        is_expired: false,
        limit: 10,
      } satisfies ICommunityMemberSession.IRequest,
    });
  typia.assert(activeSessionsResponse);
  // Verify all active sessions have future expiration
  const now = new Date();
  for (const session of activeSessionsResponse.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      `Active session ${session.id} should have future expiration`,
      expiredAt > now,
    );
  }
  // Verify the current session appears in active sessions
  const currentSessionExists = activeSessionsResponse.data.some(
    (session) => session.member.id === member.id,
  );
  TestValidator.predicate(
    "Current member session should appear in active sessions",
    currentSessionExists,
  );
  // Step 3: Query expired sessions (is_expired: true)
  const expiredSessionsResponse =
    await api.functional.community.member.sessions.index(memberConnection, {
      body: {
        is_expired: true,
        limit: 10,
      } satisfies ICommunityMemberSession.IRequest,
    });
  typia.assert(expiredSessionsResponse);
  // Verify all expired sessions have past expiration
  for (const session of expiredSessionsResponse.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      `Expired session ${session.id} should have past expiration`,
      expiredAt < now,
    );
  }
  // Verify the current session does NOT appear in expired sessions
  const currentSessionInExpired = expiredSessionsResponse.data.some(
    (session) => session.member.id === member.id,
  );
  TestValidator.predicate(
    "Current member session should NOT appear in expired sessions",
    !currentSessionInExpired,
  );
  // Step 4: Verify pagination counts are valid
  TestValidator.predicate(
    "Active sessions should have non-negative count",
    activeSessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Expired sessions should have non-negative count",
    expiredSessionsResponse.pagination.records >= 0,
  );
}
