import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: email,
      username: RandomGenerator.alphaNumeric(10),
      password: password,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  
  // 2. Create multiple sessions by logging in
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loginConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IRedditPlatformMember.ILogin,
  });
  const loginConnection2: api.IConnection = { host: connection.host };
  await authorize_member_login(loginConnection2, {
    body: {
      email: email,
      password: password,
    } satisfies IRedditPlatformMember.ILogin,
  });
  const loginConnection3: api.IConnection = { host: connection.host };
  await authorize_member_login(loginConnection3, {
    body: {
      email: email,
      password: password,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // 3. Create authenticated connection for session listing
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberAuth.token.access}` },
  };
  // 4. Fetch active sessions
  const activeSessions =
    await api.functional.redditPlatform.member.sessions.index(
      sessionConnection,
      {
        body: {
          status: "active" as const,
          limit: 100,
        } satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 5. Fetch expired sessions
  const expiredSessions =
    await api.functional.redditPlatform.member.sessions.index(
      sessionConnection,
      {
        body: {
          status: "expired" as const,
          limit: 100,
        } satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // 6. Validate active sessions count matches pagination
  TestValidator.equals(
    "active sessions count matches pagination records",
    activeSessions.data.length,
    activeSessions.pagination.records,
  );
  // 7. Validate each active session has future expired_at
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expired_at);
    const now = new Date();
    TestValidator.predicate(
      `active session ${session.id} has future expired_at`,
      expiredAt > now,
    );
  }
  // 8. Validate expired sessions count matches pagination
  TestValidator.equals(
    "expired sessions count matches pagination records",
    expiredSessions.data.length,
    expiredSessions.pagination.records,
  );
  // 9. Validate each expired session has past expired_at
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expired_at);
    const now = new Date();
    TestValidator.predicate(
      `expired session ${session.id} has past expired_at`,
      expiredAt <= now,
    );
  }
  // 10. Verify pagination metadata is consistent
  TestValidator.equals(
    "active pagination current page is 1",
    activeSessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "expired pagination current page is 1",
    expiredSessions.pagination.current,
    1,
  );
}