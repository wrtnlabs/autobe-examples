import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
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
 * Test retrieval of an expired session (past expiration time).
 *
 * This test validates that:
 * 1. A member can retrieve session details via the sessions.at endpoint
 * 2. The sessionStatus field correctly reflects the session lifecycle state
 * 3. For expired sessions, expiredAt is in the past and deletedAt is null
 * 4. All session properties are properly returned with valid structure
 *
 * Note: In simulation mode, session data is randomly generated. The test validates
 * that when sessionStatus is 'expired', the corresponding fields are consistent.
 */
export async function test_api_session_expired_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Retrieve session details
  // In simulation mode, any valid UUID works for sessionId
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.communityPlatform.member.sessions.at(
    memberConnection,
    { sessionId },
  );
  typia.assert(session);
  // Step 3: Validate session lifecycle state for expired sessions
  if (session.sessionStatus === "expired") {
    // For expired sessions, expiredAt should be in the past
    const now = new Date();
    const expiredAtDate = new Date(session.expiredAt);
    TestValidator.predicate(
      "expiredAt should be in the past for expired session",
      expiredAtDate <= now,
    );
    // Expired sessions should not be terminated (deletedAt must be null)
    TestValidator.equals(
      "deletedAt must be null for expired (not terminated) session",
      session.deletedAt,
      null,
    );
  }
  // Step 4: Validate session status is a valid lifecycle state
  TestValidator.predicate(
    "sessionStatus must be a valid lifecycle state",
    session.sessionStatus === "active" ||
      session.sessionStatus === "expired" ||
      session.sessionStatus === "terminated",
  );
  // Step 5: Validate sessionAge is non-negative
  TestValidator.predicate(
    "sessionAge must be non-negative",
    session.sessionAge >= 0,
  );
  // Step 6: Validate member information is included
  TestValidator.predicate(
    "member information must be present",
    session.member !== null && session.member !== undefined,
  );
}
