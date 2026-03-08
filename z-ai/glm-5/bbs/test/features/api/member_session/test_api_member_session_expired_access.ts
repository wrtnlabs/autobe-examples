import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test session retrieval and expiration status validation.
 *
 * This test verifies that:
 * 1. A session can be created through member registration
 * 2. The session can be retrieved using the sessions.at endpoint
 * 3. The expired_at timestamp is properly formatted
 * 4. The client can determine session validity by comparing timestamps
 */
export async function test_api_member_session_expired_access(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as a new member - this creates a session
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // The session is created during registration. To retrieve session details,
  // we need the session ID. The session ID is included as a claim in the JWT access token.
  // Decode the JWT payload to extract the session identifier.
  const tokenParts = authorized.token.access.split(".");
  const base64Payload = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
  const payloadJson =
    typeof Buffer !== "undefined"
      ? Buffer.from(base64Payload, "base64").toString("utf8")
      : atob(base64Payload);
  const payload = JSON.parse(payloadJson);
  const sessionId =
    (payload.sid as string | undefined) ??
    (payload.session_id as string | undefined) ??
    (payload.jti as string | undefined);
  // Validate session ID was extracted from token
  TestValidator.predicate(
    "session ID exists in JWT claims",
    sessionId !== undefined && sessionId !== null,
  );
  // Retrieve the session using the sessions.at endpoint
  const session = await api.functional.discussionBoard.member.sessions.at(
    memberConnection,
    { sessionId: sessionId! },
  );
  typia.assert(session);
  // Validate expired_at field is present and properly formatted
  const expiredAtDate = new Date(session.expired_at);
  TestValidator.predicate(
    "expired_at is valid ISO date-time format",
    !isNaN(expiredAtDate.getTime()),
  );
  // Verify client can determine session validity by comparing timestamps
  const now = new Date();
  const isExpired = expiredAtDate <= now;
  // For a newly created session, it should not be expired
  TestValidator.predicate("new session shows active status", !isExpired);
  // Verify session owner matches the authenticated member
  TestValidator.equals(
    "session member matches authenticated user",
    session.member.id,
    authorized.id,
  );
  // Validate session metadata is present
  TestValidator.predicate(
    "session has valid created_at",
    !isNaN(new Date(session.created_at).getTime()),
  );
  TestValidator.predicate("session has ip address", session.ip.length > 0);
  TestValidator.predicate("session has href", session.href.length > 0);
  // Validate token-level expiration timestamps are also properly formatted
  const tokenExpiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "token expired_at is valid",
    !isNaN(tokenExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    !isNaN(refreshableUntil.getTime()),
  );
  // The session expired_at should align with token expiration
  // Token expiration should occur before the refresh deadline
  TestValidator.predicate(
    "token expires before refresh deadline",
    tokenExpiredAt <= refreshableUntil,
  );
}
