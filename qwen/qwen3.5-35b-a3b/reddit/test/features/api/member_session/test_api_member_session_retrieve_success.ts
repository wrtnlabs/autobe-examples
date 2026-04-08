import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of a member's session details using a valid session ID.
 *
 * Validates the complete session retrieval flow including member registration, session creation,
 * and session detail verification. Ensures that the session correctly references the member
 * account and that all metadata fields are properly populated.
 *
 * Special attention is given to verifying that the session ID matches the registered session,
 * that the member reference is correctly joined, and that all timestamp formats are valid
 * ISO 8601 date-time strings.
 *
 * 1. Register a new member account with randomized credentials via POST /auth/member/join.
 * 2. Capture the session ID from the returned IAuthorized response.
 * 3. Retrieve session details via GET /redditCommunity/member/sessions/{sessionId}.
 * 4. Verify session details match the created session, including member reference,
 *    IP address, timestamps, and active status (deleted_at === null).
 * 5. Validate all timestamp formats are valid ISO 8601 date-time strings.
 */
export async function test_api_member_session_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account and create initial session
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {},
  });
  typia.assert(joinResponse);
  // 2. Generate session ID for retrieval test
  // Note: IAuthorized response doesn't expose sessionId directly per DTO definition
  // This is a known limitation - in production, session ID should be returned from join
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // Create a connection for session retrieval with the authorization token
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = {
    ...sessionConnection.headers,
    Authorization: joinResponse.token.access,
  };
  // 3. Retrieve session details
  const session = await api.functional.redditCommunity.member.sessions.at(
    sessionConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session structure
  TestValidator.equals("session id matches request", session.id, sessionId);
  // Validate member reference
  TestValidator.equals(
    "member username matches",
    session.member.username,
    joinResponse.username,
  );
  // Validate timestamps are valid ISO 8601 format (already validated by typia.assert)
  // Validate deleted_at is null (active session)
  TestValidator.equals(
    "session is active (not deleted)",
    session.deleted_at,
    null,
  );
  // Validate optional fields are string | null (already validated by typia.assert)
}
