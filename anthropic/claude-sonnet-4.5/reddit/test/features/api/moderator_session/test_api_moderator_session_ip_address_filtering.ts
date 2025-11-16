import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorSession";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

/**
 * Test that moderators can filter their session history by specific IP
 * addresses.
 *
 * This scenario validates the IP-based session filtering functionality for
 * moderators. Since the available API only provides a join (registration)
 * endpoint and no separate login endpoint, this test creates a moderator
 * account with a specific IP address, then queries the sessions endpoint with
 * the IP filter parameter to verify that only sessions matching the specified
 * IP address are returned.
 *
 * This is a critical security feature allowing moderators to:
 *
 * 1. Investigate suspicious login patterns from specific locations
 * 2. Verify expected login sources
 * 3. Monitor access from particular IP addresses
 *
 * Steps:
 *
 * 1. Create moderator account with a specific IP address
 * 2. Query sessions with IP filter parameter matching the registration IP
 * 3. Validate that sessions from the filtered IP are returned
 * 4. Query with a different IP filter and verify no results (or empty results)
 * 5. Verify session data matches the expected IP address
 */
export async function test_api_moderator_session_ip_address_filtering(
  connection: api.IConnection,
) {
  // Define the IP address for moderator registration
  const moderatorIP = "192.168.1.100";
  const nonExistentIP = "10.0.0.99";

  // Create moderator account with specific IP address
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: moderatorIP,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Query sessions filtered by the registration IP address
  const filteredByModeratorIP: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          ip: moderatorIP,
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(filteredByModeratorIP);

  // Validate that results contain sessions from the filtered IP
  TestValidator.predicate(
    "filtered sessions should contain at least one session",
    filteredByModeratorIP.data.length > 0,
  );

  // Verify all returned sessions match the moderator's registration IP
  for (const session of filteredByModeratorIP.data) {
    TestValidator.equals(
      "session IP should match the filter parameter",
      session.ip,
      moderatorIP,
    );
  }

  // Query sessions with a non-existent IP filter
  const filteredByNonExistentIP: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          ip: nonExistentIP,
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(filteredByNonExistentIP);

  // Validate that no sessions are returned for non-existent IP
  TestValidator.equals(
    "no sessions should be returned for non-existent IP",
    filteredByNonExistentIP.data.length,
    0,
  );

  // Query all sessions without IP filter for comparison
  const allSessions: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(allSessions);

  // Validate that filtered results count matches or is less than total sessions
  TestValidator.predicate(
    "filtered sessions count should be less than or equal to total sessions",
    filteredByModeratorIP.data.length <= allSessions.data.length,
  );

  // Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination records should be non-negative",
    filteredByModeratorIP.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination data length should not exceed limit",
    filteredByModeratorIP.data.length <= 100,
  );
}
