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
 * Test advanced filtering and sorting capabilities for member session
 * retrieval.
 *
 * This test validates that members can search, filter, and sort their session
 * history using various query parameters including sort_by, order, and
 * include_expired. The test creates a member account which generates an initial
 * session, then retrieves and validates session data with different sorting and
 * filtering combinations.
 *
 * Test workflow:
 *
 * 1. Create a new member account via join operation (creates first session)
 * 2. Retrieve sessions with default parameters to verify base functionality
 * 3. Test descending sort order (sort_by='created_at', order='desc')
 * 4. Test ascending sort order (sort_by='created_at', order='asc')
 * 5. Validate include_expired parameter with value false (default)
 * 6. Verify all returned sessions have expired_at as null when include_expired is
 *    false
 * 7. Test pagination works correctly with sorting applied
 */
export async function test_api_member_session_filtering_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account (generates first session automatically)
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "192.168.1.100",
    href: "https://reddit-community.example.com/register",
    referrer: "https://reddit-community.example.com/home",
  } satisfies IRedditCommunityGuest.ICreate;

  const authorizedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Verify member creation and token issuance
  TestValidator.predicate(
    "member should have valid ID",
    authorizedMember.id.length > 0,
  );
  TestValidator.equals(
    "username should match",
    authorizedMember.username,
    memberData.username,
  );
  TestValidator.equals(
    "email should match",
    authorizedMember.email,
    memberData.email,
  );

  // Step 2: Retrieve sessions with default parameters (descending by created_at)
  const defaultSessions: IPageIRedditCommunityMemberSession.ISummary =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: authorizedMember.username,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(defaultSessions);

  // Validate pagination metadata
  TestValidator.predicate(
    "default sessions should have at least one session",
    defaultSessions.data.length >= 1,
  );
  TestValidator.equals(
    "pagination current page should be 0",
    defaultSessions.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination records should be at least 1",
    defaultSessions.pagination.records >= 1,
  );

  // Step 3: Test descending sort order (newest first)
  const descendingSessions: IPageIRedditCommunityMemberSession.ISummary =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: authorizedMember.username,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(descendingSessions);

  TestValidator.predicate(
    "descending sessions should return data",
    descendingSessions.data.length >= 1,
  );

  // Verify descending order (newest to oldest)
  if (descendingSessions.data.length > 1) {
    for (let i = 0; i < descendingSessions.data.length - 1; i++) {
      const current = new Date(descendingSessions.data[i].created_at);
      const next = new Date(descendingSessions.data[i + 1].created_at);
      TestValidator.predicate(
        `session ${i} should be newer than session ${i + 1} in descending order`,
        current >= next,
      );
    }
  }

  // Step 4: Test ascending sort order (oldest first)
  const ascendingSessions: IPageIRedditCommunityMemberSession.ISummary =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: authorizedMember.username,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "asc",
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(ascendingSessions);

  TestValidator.predicate(
    "ascending sessions should return data",
    ascendingSessions.data.length >= 1,
  );

  // Verify ascending order (oldest to newest)
  if (ascendingSessions.data.length > 1) {
    for (let i = 0; i < ascendingSessions.data.length - 1; i++) {
      const current = new Date(ascendingSessions.data[i].created_at);
      const next = new Date(ascendingSessions.data[i + 1].created_at);
      TestValidator.predicate(
        `session ${i} should be older than session ${i + 1} in ascending order`,
        current <= next,
      );
    }
  }

  // Step 5: Test include_expired parameter with false value (only active sessions)
  const activeSessions: IPageIRedditCommunityMemberSession.ISummary =
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
  typia.assert(activeSessions);

  // Step 6: Validate all returned sessions have expired_at as null
  for (let i = 0; i < activeSessions.data.length; i++) {
    const session = activeSessions.data[i];
    TestValidator.predicate(
      `active session ${i} should have expired_at as null or undefined`,
      session.expired_at === null || session.expired_at === undefined,
    );
  }

  // Step 7: Test pagination with sorting applied
  const paginatedSessions: IPageIRedditCommunityMemberSession.ISummary =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: authorizedMember.username,
        body: {
          page: 1,
          limit: 5,
          sort_by: "created_at",
          order: "desc",
          include_expired: false,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(paginatedSessions);

  // Validate pagination works with limit
  TestValidator.predicate(
    "paginated sessions should respect limit",
    paginatedSessions.data.length <= 5,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedSessions.pagination.limit,
    5,
  );

  // Verify session data contains required fields
  if (paginatedSessions.data.length > 0) {
    const firstSession = paginatedSessions.data[0];
    TestValidator.predicate(
      "session should have valid UUID id",
      firstSession.id.length > 0,
    );
    TestValidator.predicate(
      "session should have reddit_community_member_id",
      firstSession.reddit_community_member_id.length > 0,
    );
    TestValidator.equals(
      "session member_id should match created member",
      firstSession.reddit_community_member_id,
      authorizedMember.id,
    );
    TestValidator.predicate(
      "session should have ip address",
      firstSession.ip.length > 0,
    );
    TestValidator.predicate(
      "session should have href",
      firstSession.href.length > 0,
    );
    TestValidator.predicate(
      "session should have referrer",
      firstSession.referrer.length > 0,
    );
    TestValidator.predicate(
      "session should have created_at timestamp",
      firstSession.created_at.length > 0,
    );
  }
}
