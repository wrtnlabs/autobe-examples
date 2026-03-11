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

export async function test_api_member_session_termination_another_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberA);
  // 2. Create Member B account and store credentials separately
  const memberBCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: memberBCreds,
  });
  typia.assert(memberB);
  // 3. Get Member B's session ID from their sessions list
  const memberBSessionId: string | undefined = memberB.sessions[0]?.id;
  TestValidator.equals(
    "Member B has at least one session",
    memberBSessionId !== undefined,
    true,
  );
  // 4. Create Member A's own connection with their token
  const memberAWithTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberA.token.access}`,
    },
  };
  // 5. Member A attempts to terminate Member B's session
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "cross-user session termination forbidden",
    403,
    async () => {
      await api.functional.redditPlatform.member.sessions.erase(
        memberAWithTokenConnection,
        {
          sessionId: memberBSessionId!,
        },
      );
    },
  );
  // 6. Verify Member B can still authenticate (session not terminated)
  const memberBLoginConnection: api.IConnection = { host: connection.host };
  const memberBAfterAttempt = await authorize_member_login(
    memberBLoginConnection,
    {
      body: {
        email: memberBCreds.email,
        password: memberBCreds.password,
      },
    },
  );
  typia.assert(memberBAfterAttempt);
  // 7. Verify Member B's session count is at least 1 (they should still have active sessions)
  TestValidator.predicate(
    "member B still has active sessions",
    memberBAfterAttempt.sessions.length >= 1,
  );
}
