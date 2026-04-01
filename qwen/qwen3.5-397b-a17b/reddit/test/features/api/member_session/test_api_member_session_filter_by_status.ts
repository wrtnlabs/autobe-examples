import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can filter their session history by session status (active or expired).
 * The member authenticates and creates the test scenario by having multiple sessions with different expiration states.
 * Filter sessions with status='active' to verify only sessions where expired_at is in the future are returned.
 * Then filter with status='expired' to verify only sessions where expired_at is in the past are returned.
 * Validate that the status filter correctly computes session state based on expired_at comparison with current timestamp.
 * Verify pagination metadata accurately reflects the filtered result count.
 */
export async function test_api_member_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - creates initial session
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Fetch all sessions without status filter to get baseline
  const allSessions =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // 3. Filter by active status (expired_at > now)
  const activeSessions =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 4. Filter by expired status (expired_at <= now)
  const expiredSessions =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // 5. Validate active sessions have expired_at in future
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "active session expired_at is in future",
      new Date(session.expired_at).getTime() > Date.now(),
    );
  }
  // 6. Validate expired sessions have expired_at in past
  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      "expired session expired_at is in past",
      new Date(session.expired_at).getTime() <= Date.now(),
    );
  }
  // 7. Validate pagination metadata accuracy
  TestValidator.predicate(
    "active pagination records match data length",
    activeSessions.pagination.records === activeSessions.data.length,
  );
  TestValidator.predicate(
    "expired pagination records match data length",
    expiredSessions.pagination.records === expiredSessions.data.length,
  );
  // 8. Validate that active + expired counts equal total
  TestValidator.equals(
    "active + expired equals total sessions",
    activeSessions.pagination.records + expiredSessions.pagination.records,
    allSessions.pagination.records,
  );
}
