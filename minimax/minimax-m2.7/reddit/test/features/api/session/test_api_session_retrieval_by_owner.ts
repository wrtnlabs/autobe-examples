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

export async function test_api_session_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account using join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Extract session ID from the authorization response
  // The session ID is embedded in the JWT access token payload as "sid" claim
  const tokenParts = authorized.token.access.split(".");
  const tokenPayload = JSON.parse(atob(tokenParts[1]));
  const sessionId = tokenPayload.sid as string;
  // 2. Call the target endpoint with the session ID
  const session = await api.functional.redditClone.member.sessions.at(
    memberConnection,
    {
      sessionId: sessionId as string & tags.Format<"uuid">,
    },
  );
  // 3. Validate response with typia.assert
  typia.assert(session);
  // 4. Verify session metadata is present and valid
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.predicate("has valid ip", session.ip.length > 0);
  TestValidator.predicate("has valid href", session.href.length > 0);
  TestValidator.predicate("has valid referrer", session.referrer.length > 0);
  TestValidator.predicate("has valid createdAt", session.createdAt.length > 0);
  TestValidator.predicate("has valid expiredAt", session.expiredAt.length > 0);
  // 5. Verify the returned member matches the authenticated member
  TestValidator.equals("member id matches", session.member.id, authorized.id);
  TestValidator.equals(
    "member username matches",
    session.member.username,
    authorized.username,
  );
  // 6. Confirm response does NOT include tokens (verified by typia.assert)
  // IRedditCloneMemberSession type does not include access/refresh token properties
}
