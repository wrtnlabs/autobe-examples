import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_cross_member_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Register memberA
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // Register memberB
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // Extract sessionId from JWT token payload (jti claim)
  const extractSessionId = (token: string): string => {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.jti;
  };
  const memberASessionId = extractSessionId(memberA.token.access);
  const memberBSessionId = extractSessionId(memberB.token.access);
  // Test: memberA tries to access memberB's session - should return 403
  await TestValidator.httpError(
    "memberA cannot access memberB's session",
    403,
    async () =>
      await api.functional.redditClone.member.members.sessions.at(
        memberAConnection,
        {
          sessionId: memberBSessionId as `string & tags.Format<"uuid">`,
        },
      ),
  );
  // Test: memberB tries to access memberA's session - should return 403
  await TestValidator.httpError(
    "memberB cannot access memberA's session",
    403,
    async () =>
      await api.functional.redditClone.member.members.sessions.at(
        memberBConnection,
        {
          sessionId: memberASessionId as `string & tags.Format<"uuid">`,
        },
      ),
  );
}
