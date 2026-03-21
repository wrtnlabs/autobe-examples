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

export async function test_api_session_logout_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via registration
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IRedditCloneMemberSession.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Extract session ID from the JWT access token payload
  const tokenParts = authorized.token.access.split(".");
  const tokenPayload = JSON.parse(atob(tokenParts[1]));
  const sessionId = tokenPayload.session_id as string;
  // 3. Call DELETE /redditClone/member/members/sessions/{sessionId} to logout
  await api.functional.redditClone.member.members.sessions.erase(
    memberConnection,
    {
      sessionId: sessionId as string & tags.Format<"uuid">,
    },
  );
  // 4. Verify the session is terminated by attempting a protected action
  // After logout, the token should be rejected with 401 Unauthorized
  await TestValidator.httpError(
    "token should be invalid after logout",
    401,
    () =>
      api.functional.redditClone.auth.member.join(memberConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          username: RandomGenerator.name(),
          href: "http://localhost:3000",
          referrer: "http://localhost:3000",
        } satisfies IRedditCloneMemberSession.IJoin,
      }),
  );
}
