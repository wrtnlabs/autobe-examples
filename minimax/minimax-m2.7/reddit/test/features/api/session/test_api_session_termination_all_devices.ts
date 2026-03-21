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

export async function test_api_session_termination_all_devices(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account using join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Verify login creates an active session (token exists)
  TestValidator.predicate(
    "has valid access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    authorized.token.refresh.length > 0,
  );
  // 3. Call DELETE /redditClone/member/members/sessions/all to terminate all sessions
  // Returns 204 No Content on success
  await api.functional.redditClone.member.members.sessions.all.eraseAll(
    memberConnection,
  );
  // 4. Verify the access token from login becomes invalid
  // Attempt to use the terminated token should result in 401 Unauthorized
  await TestValidator.error(
    "token should be invalid after session termination",
    async () => {
      const invalidConnection: api.IConnection = {
        host: connection.host,
        headers: {
          Authorization: `Bearer ${authorized.token.access}`,
        },
      };
      // Try to terminate sessions again - should fail with 401 since token is now invalid
      await api.functional.redditClone.member.members.sessions.all.eraseAll(
        invalidConnection,
      );
    },
  );
}
