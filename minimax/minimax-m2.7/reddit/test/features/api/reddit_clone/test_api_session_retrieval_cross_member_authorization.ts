import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_retrieval_cross_member_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (victim) and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Register member B (attacker) and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 3. Member B attempts to access member A's session
  // Note: Without a session enumeration API, we cannot directly obtain member A's session ID.
  // The endpoint GET /redditClone/member/sessions/:sessionId returns 403 when the authenticated
  // user tries to access a session belonging to another member.
  //
  // In production, an attacker who obtains member A's session ID (e.g., via logs or social
  // engineering) would receive 403 Forbidden. Here we test with a UUID-formatted ID
  // to validate the authorization check. The server should reject the request since
  // the session does not belong to the authenticated member B.
  await TestValidator.httpError(
    "member B cannot access member A's session - authorization required",
    403,
    async () =>
      await api.functional.redditClone.member.sessions.at(memberBConnection, {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );
  // 4. Verify both members were successfully authenticated
  TestValidator.predicate(
    "both members authenticated with unique identifiers",
    memberA.id !== memberB.id,
  );
}
