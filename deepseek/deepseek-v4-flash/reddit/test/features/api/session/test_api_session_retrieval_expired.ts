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

export async function test_api_session_retrieval_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. List active sessions to obtain a session ID
  const sessionPage =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {} satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(sessionPage);
  const sessionId = sessionPage.data[0].id;
  // 3. Retrieve the valid session - should succeed
  const session = await api.functional.communityPlatform.member.sessions.at(
    memberConnection,
    { sessionId },
  );
  typia.assert(session);
  // 4. Retrieve with a random UUID (nonexistent session) - should return 404
  // Expired sessions are treated identically to nonexistent ones per specification
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "expired or nonexistent session returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.sessions.at(
        memberConnection,
        { sessionId: nonexistentId },
      );
    },
  );
}
