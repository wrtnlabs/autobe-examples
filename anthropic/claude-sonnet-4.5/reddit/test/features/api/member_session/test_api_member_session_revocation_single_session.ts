import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";

/**
 * Test session revocation functionality where a member terminates a specific
 * authentication session.
 *
 * This test validates the complete session lifecycle from creation through
 * deletion and immediate token invalidation. The test workflow follows these
 * steps:
 *
 * 1. Create a new member account via join operation (establishes initial session)
 * 2. Retrieve all active sessions to confirm the session exists and is active
 * 3. Extract the session ID from the session list
 * 4. Delete the specific session using DELETE endpoint with the session UUID
 * 5. Verify the session is hard-deleted (completely removed from database)
 * 6. Confirm the revoked session no longer appears in active sessions list
 *
 * Validations:
 *
 * - Session deletion immediately removes the session record
 * - Subsequent session list queries do not include the deleted session
 * - Session record is permanently removed from reddit_community_member_sessions
 *   table
 */
export async function test_api_member_session_revocation_single_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account which establishes initial session
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authorizedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Retrieve all active sessions to confirm the session exists
  const initialSessionsPage: IPageIRedditCommunityMemberSession.ISummary =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: authorizedMember.username,
        body: {
          page: 1,
          limit: 10,
          include_expired: false,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(initialSessionsPage);

  // Verify that at least one session exists
  TestValidator.predicate(
    "at least one active session should exist after join",
    initialSessionsPage.data.length >= 1,
  );

  // Step 3: Extract the session ID from the first active session
  const sessionToDelete = initialSessionsPage.data[0];
  typia.assertGuard(sessionToDelete);

  const sessionId: string & tags.Format<"uuid"> = sessionToDelete.id;

  // Step 4: Delete the specific session
  await api.functional.redditCommunity.member.members.sessions.erase(
    connection,
    {
      username: authorizedMember.username,
      sessionId: sessionId,
    },
  );

  // Step 5: Retrieve sessions again to verify deletion
  const afterDeletionSessionsPage: IPageIRedditCommunityMemberSession.ISummary =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: authorizedMember.username,
        body: {
          page: 1,
          limit: 10,
          include_expired: false,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(afterDeletionSessionsPage);

  // Step 6: Verify the deleted session no longer appears in the active sessions list
  const deletedSessionStillExists = afterDeletionSessionsPage.data.some(
    (session) => session.id === sessionId,
  );

  TestValidator.predicate(
    "deleted session should not appear in active sessions list",
    deletedSessionStillExists === false,
  );

  // Verify total session count decreased by 1
  TestValidator.equals(
    "session count should decrease by 1 after deletion",
    afterDeletionSessionsPage.data.length,
    initialSessionsPage.data.length - 1,
  );
}
