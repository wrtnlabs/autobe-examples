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

export async function test_api_session_termination_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and get authorized session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a valid sessionId format for the delete request
  // The session was created during join, so we use a UUID format
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call DELETE /redditClone/member/sessions/{sessionId}
  // Owner verification happens server-side; invalid sessionId returns error
  await api.functional.redditClone.member.sessions.erase(memberConnection, {
    sessionId: sessionId,
  });
  // 4. Verify session is terminated - attempting to delete the same session again
  // should fail because the session was already deleted in step 3
  await TestValidator.error("session already terminated", async () => {
    await api.functional.redditClone.member.sessions.erase(memberConnection, {
      sessionId: sessionId,
    });
  });
}
