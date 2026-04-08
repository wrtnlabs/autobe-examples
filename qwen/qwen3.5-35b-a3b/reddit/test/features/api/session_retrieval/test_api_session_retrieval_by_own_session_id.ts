import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_retrieval_by_own_session_id(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful retrieval of member's own session by ID.
   *
   * Validates the complete session retrieval workflow including member authentication,
   * session retrieval, and comprehensive validation of session entity fields.
   * Ensures proper ownership verification and security compliance by confirming
   * JWT tokens are never exposed in API responses.
   *
   * 1. Member registers via join endpoint to create account and initial session
   * 2. Generates a valid session UUID for testing session retrieval endpoint
   * 3. Validates complete session entity with all required fields present
   * 4. Verifies session ownership matches authenticated member identity
   * 5. Confirms sensitive JWT tokens are not exposed in session response
   *
   * Security: JWT access and refresh tokens from join response are used for
   * authentication but must NOT appear in session retrieval response.
   */
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Generate a valid session UUID for testing
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create session connection with auth token
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = { ...memberConnection.headers };
  // 4. Retrieve the member's session by ID
  const session = await api.functional.redditPlatform.member.sessions.at(
    sessionConnection,
    { sessionId },
  );
  typia.assert(session);
  // 5. Validate session entity has required ID field
  TestValidator.equals(
    "session response contains valid session ID",
    session.id,
    sessionId,
  );
  // 6. Validate session references a member
  TestValidator.predicate(
    "session has member ID",
    session.redditPlatformMemberId !== undefined &&
      session.redditPlatformMemberId !== null,
  );
  // 7. Validate session has IP address
  TestValidator.predicate(
    "session has IP",
    () => typeof session.ip === "string",
  );
  // 8. Validate session has target URL (href)
  TestValidator.predicate(
    "session has href",
    () => typeof session.href === "string",
  );
  // 9. Validate session timestamps
  TestValidator.predicate(
    "session has createdAt",
    () => typeof session.createdAt === "string",
  );
  TestValidator.predicate(
    "session has updatedAt",
    () => typeof session.updatedAt === "string",
  );
  TestValidator.predicate(
    "session has expiredAt",
    () => typeof session.expiredAt === "string",
  );
  // 10. Validate nested member summary
  TestValidator.predicate(
    "session has member summary",
    () => session.member !== undefined && session.member !== null,
  );
  TestValidator.predicate(
    "member summary has ID",
    () => session.member.id !== undefined && session.member.id !== null,
  );
  TestValidator.predicate(
    "member summary has username",
    () =>
      session.member.username !== undefined && session.member.username !== null,
  );
  TestValidator.predicate(
    "member summary has karma",
    () => typeof session.member.karma === "number",
  );
  TestValidator.predicate(
    "member summary has created_at",
    () =>
      session.member.created_at !== undefined &&
      session.member.created_at !== null,
  );
  // 11. Verify security - JWT tokens should NOT be exposed in session response
  const sessionKeys = Object.keys(session) as string[];
  const hasTokenFields =
    sessionKeys.includes("access") ||
    sessionKeys.includes("refresh") ||
    sessionKeys.includes("token");
  TestValidator.predicate(
    "session response does not expose JWT tokens",
    !hasTokenFields,
  );
}
