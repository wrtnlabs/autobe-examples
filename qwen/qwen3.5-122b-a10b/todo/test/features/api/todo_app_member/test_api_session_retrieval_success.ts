import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful session retrieval for an authenticated member.
 *
 * This test validates the primary success path for retrieving authentication
 * session details. It verifies that:
 * - A member can successfully authenticate and create a session
 * - The session retrieval endpoint returns complete session metadata
 * - All session fields are present with correct data types
 * - The session's member ID matches the authenticated member
 *
 * Session metadata includes: session ID, member ID, client IP, login URL (href),
 * optional referrer, creation timestamp, and expiration timestamp.
 *
 * Note: This test uses simulation mode where session ID is randomly generated.
 * In production, the session ID would be obtained from an actual session creation
 * or listing endpoint.
 */
export async function test_api_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to create an authenticated session
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create a member-specific connection with the authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${joinResult.token.access}` },
  };
  // 3. Generate a valid UUID for the session ID to retrieve
  // In simulation mode, this generates random valid session data
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the session details
  const session = await api.functional.todoApp.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session structure and data types
  TestValidator.equals("session ID is UUID format", session.id, sessionId);
  TestValidator.equals(
    "member ID matches authenticated member",
    session.memberId,
    joinResult.id,
  );
  TestValidator.predicate("IP address is non-empty", session.ip.length > 0);
  TestValidator.predicate("href is valid URI", session.href.length > 0);
  TestValidator.predicate(
    "createdAt is valid datetime",
    session.createdAt.length > 0,
  );
  TestValidator.predicate(
    "expiredAt is valid datetime",
    session.expiredAt.length > 0,
  );
  // 6. Verify timestamps are in ISO 8601 format and valid dates
  const createdAtDate = new Date(session.createdAt);
  const expiredAtDate = new Date(session.expiredAt);
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(createdAtDate.getTime()),
  );
  TestValidator.predicate(
    "expiredAt is valid date",
    !isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "session expires in the future",
    expiredAtDate > new Date(),
  );
  // 7. Validate optional referrer field (may be null or undefined)
  if (session.referrer !== null && session.referrer !== undefined) {
    TestValidator.predicate(
      "referrer is valid URI when present",
      session.referrer.length > 0,
    );
  }
}
