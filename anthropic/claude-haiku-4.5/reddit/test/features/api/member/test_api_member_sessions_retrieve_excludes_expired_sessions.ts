import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";

/**
 * Validates that the session retrieval endpoint correctly filters and returns
 * only active sessions while excluding expired sessions.
 *
 * This test ensures proper session lifecycle management by:
 *
 * 1. Creating a member account which establishes an initial active session
 * 2. Retrieving all sessions for the authenticated member
 * 3. Verifying that only active sessions (expired_at = null) are returned
 * 4. Confirming pagination metadata is correctly provided
 * 5. Validating that expired sessions are properly excluded from results
 *
 * The session filtering is critical for security and account management,
 * allowing members to see their active login sessions across multiple devices
 * while hiding terminated sessions.
 */
export async function test_api_member_sessions_retrieve_excludes_expired_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a member account through registration
  // This establishes the initial session and authenticates the user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!",
    ip: "192.168.1.1",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const authorizedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Retrieve all sessions for the authenticated member
  // This endpoint should return only active sessions (expired_at = null)
  const sessionsResponse: IPageICommunityPlatformMemberSession.ISummary =
    await api.functional.communityPlatform.member.auth.member.sessions.index(
      connection,
    );
  typia.assert(sessionsResponse);

  // Step 3: Verify that sessions were retrieved and pagination is valid
  TestValidator.predicate(
    "sessions response contains pagination data",
    sessionsResponse.pagination.current >= 0 &&
      sessionsResponse.pagination.limit >= 0 &&
      sessionsResponse.pagination.records >= 0 &&
      sessionsResponse.pagination.pages >= 0,
  );

  // Step 4: Verify data array contains at least one session
  TestValidator.predicate(
    "at least one active session exists",
    Array.isArray(sessionsResponse.data) && sessionsResponse.data.length > 0,
  );

  // Step 5: Verify all returned sessions are active (expired_at is null/undefined)
  // This is the critical validation that the endpoint excludes expired sessions
  const allSessionsActive = sessionsResponse.data.every(
    (session: ICommunityPlatformMemberSession.ISummary) =>
      session.expired_at === null || session.expired_at === undefined,
  );

  TestValidator.predicate(
    "all returned sessions are active with expired_at = null",
    allSessionsActive,
  );

  // Step 6: Verify at least one session corresponds to the member's login
  // and has all required properties populated
  const activeSessionExists = sessionsResponse.data.some(
    (session: ICommunityPlatformMemberSession.ISummary) =>
      session.id &&
      session.href &&
      session.created_at &&
      (session.expired_at === null || session.expired_at === undefined),
  );

  TestValidator.predicate(
    "member has an active session with complete session data",
    activeSessionExists,
  );
}
