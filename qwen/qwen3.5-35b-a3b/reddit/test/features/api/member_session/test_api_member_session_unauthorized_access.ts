import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
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

export async function test_api_member_session_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate and store Member A credentials
  const memberACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  // 2. Create Member A account and get token
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: memberACredentials,
  });
  typia.assert(memberA);
  const memberAId = memberA.id;
  const memberAToken = memberA.token.access;
  // 3. Generate and store Member B credentials
  const memberBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  // 4. Create Member B account and get token
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: memberBCredentials,
  });
  typia.assert(memberB);
  const memberBId = memberB.id;
  // 5. Member B logs in to create a session and get session ID
  const memberBSessionConnection: api.IConnection = { host: connection.host };
  const memberBLogin = await authorize_member_login(memberBSessionConnection, {
    body: {
      email: memberBCredentials.email,
      password: memberBCredentials.password,
    } satisfies IRedditPlatformMember.ILogin,
  });
  typia.assert(memberBLogin);
  const memberBSessionId =
    memberBLogin.sessions.length > 0 ? memberBLogin.sessions[0].id : null;
  if (!memberBSessionId) {
    throw new Error("Member B has no session available for testing");
  }
  // 6. Member A logs in to get their own session
  const memberALoginConnection: api.IConnection = { host: connection.host };
  const memberALogin = await authorize_member_login(memberALoginConnection, {
    body: {
      email: memberACredentials.email,
      password: memberACredentials.password,
    } satisfies IRedditPlatformMember.ILogin,
  });
  typia.assert(memberALogin);
  // 7. Member A attempts to retrieve Member B's session (unauthorized access)
  const memberAUnauthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberALogin.token.access,
    },
  };
  await TestValidator.httpError(
    "Member A cannot access Member B's session",
    [403, 404],
    async () => {
      await api.functional.redditPlatform.member.sessions.at(
        memberAUnauthorizedConnection,
        {
          sessionId: memberBSessionId,
        },
      );
    },
  );
  // 8. Verify Member A can still access their own session (sanity check)
  const memberAOwnSessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberALogin.token.access,
    },
  };
  const memberAOwnSessionId =
    memberALogin.sessions.length > 0 ? memberALogin.sessions[0].id : null;
  if (memberAOwnSessionId) {
    const memberAOwnSession =
      await api.functional.redditPlatform.member.sessions.at(
        memberAOwnSessionConnection,
        {
          sessionId: memberAOwnSessionId,
        },
      );
    typia.assert(memberAOwnSession);
    TestValidator.equals(
      "session belongs to Member A",
      memberAOwnSession.member_id,
      memberAId,
    );
  }
}
