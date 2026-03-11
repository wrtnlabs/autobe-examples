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

export async function test_api_session_limit_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account with deterministic credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joinInput = {
    email,
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
    password: password satisfies string as string & tags.MinLength<8>,
    displayName: undefined,
    bio: null,
    avatarUrl: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(member);
  // 2. Create 6 concurrent sessions by logging in 6 times
  const loginResults = await ArrayUtil.asyncRepeat(6, async (index) => {
    const loginConnection: api.IConnection = { host: connection.host };
    const loginInput = {
      email,
      password,
    } satisfies IRedditPlatformMember.ILogin;
    const loginResult = await api.functional.redditPlatform.auth.member.login(
      loginConnection,
      {
        body: loginInput,
      },
    );
    typia.assert(loginResult);
    return loginResult;
  });
  // 3. Retrieve the session list for the authenticated member
  const sessionConnection: api.IConnection = { host: connection.host };
  const sessionResponse: IPageIRedditPlatformMemberSession.ISummary =
    await api.functional.redditPlatform.member.sessions.index(
      sessionConnection,
      {
        body: { status: "active" },
      },
    );
  typia.assert(sessionResponse);
  // 4. Verify the session limit is enforced (exactly 5 active sessions)
  TestValidator.equals(
    "exactly 5 active sessions after 6th login",
    sessionResponse.data.length,
    5,
  );
  // 5. Verify all sessions belong to the same member
  for (const session of sessionResponse.data) {
    TestValidator.equals(
      "session belongs to member",
      session.member.id,
      member.user.id,
    );
  }
}