import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (creates account + initial session)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. List the member's active sessions
  const sessionList =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {} satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(sessionList);
  // 3. Extract a session ID — the join creates at least one session
  TestValidator.predicate(
    "has at least one session",
    sessionList.data.length >= 1,
  );
  const sessionSummary = sessionList.data[0]!;
  // 4. Retrieve the session by its unique ID
  const session = await api.functional.communityPlatform.member.sessions.at(
    memberConnection,
    {
      sessionId: sessionSummary.id,
    },
  );
  typia.assert(session);
  // 5. Validate business logic
  // 5.1. The session's member must match the authenticated member
  TestValidator.equals(
    "session member id matches authenticated member",
    session.member.id,
    authorized.id,
  );
  // 5.2. The session must not be expired (expired_at is in the future)
  TestValidator.predicate("session is not expired", () => {
    const expiredAt = new Date(session.expired_at).getTime();
    const now = Date.now();
    return expiredAt > now;
  });
}
