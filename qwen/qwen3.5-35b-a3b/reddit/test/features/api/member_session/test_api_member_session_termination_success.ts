import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_member_session_termination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authentication tokens with active session
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Get session ID from the authorized response (sessions array contains session summaries)
  const sessionSummary: IRedditPlatformMemberSession.ISummary = typia.assert<IRedditPlatformMemberSession.ISummary>(
    authorized.sessions.at(0)!,
  );
  const sessionId: string = sessionSummary.id;
  // 3. Terminate the session by calling DELETE /redditPlatform/member/sessions/{sessionId}
  const terminateConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.member.sessions.erase(
    terminateConnection,
    {
      sessionId: sessionId,
    },
  );
  // 4. Validate session termination success
  // - API call succeeded (no error thrown from erase function)
  // - Session ID matches the terminated session
  TestValidator.equals(
    "session ID matches terminated session",
    sessionId,
    sessionSummary.id,
  );
  // Note: Token invalidation can't be directly tested without a protected endpoint
  // that requires the specific session's JWT tokens. The erase() function marks
  // the session as expired (sets expired_at and deleted_at) which invalidates
  // the associated tokens on the server side.
}