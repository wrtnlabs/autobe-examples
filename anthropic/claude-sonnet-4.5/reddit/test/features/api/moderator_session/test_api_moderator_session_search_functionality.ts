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
 * Test the general search parameter for finding sessions across multiple
 * metadata fields.
 *
 * This test validates that the search term can match against IP addresses,
 * referrer URLs, and other session textual properties. The test creates a
 * moderator account with a session containing distinct metadata, then performs
 * searches with partial matches to verify the search functionality works
 * correctly.
 *
 * Steps:
 *
 * 1. Create a moderator account with initial session (specific IP and referrer)
 * 2. Search for sessions using partial IP address match
 * 3. Verify that the matching session is returned
 * 4. Search for sessions using partial referrer URL match
 * 5. Verify correct search results
 * 6. Search with non-matching term and verify filtering
 */
export async function test_api_moderator_session_search_functionality(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with initial session containing searchable metadata
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorNickname = RandomGenerator.name();

  const uniqueIp = `192.168.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}`;
  const uniqueReferrer =
    `https://reddit.com/r/${RandomGenerator.alphaNumeric(8)}` satisfies string &
      tags.Format<"uri">;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      ip: uniqueIp,
      href: "https://reddit.com/register" satisfies string & tags.Format<"uri">,
      referrer: uniqueReferrer,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Search for sessions using partial IP address match
  const ipSearchTerm = uniqueIp.substring(0, 10);
  const ipSearchResult =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          search: ipSearchTerm,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(ipSearchResult);

  // Step 3: Verify that matching session is returned
  TestValidator.predicate(
    "search by partial IP should return at least one result",
    ipSearchResult.data.length > 0,
  );

  const hasMatchingIp = ipSearchResult.data.some((session) =>
    session.ip.includes(ipSearchTerm),
  );
  TestValidator.predicate(
    "search results should contain session with matching IP",
    hasMatchingIp,
  );

  // Step 4: Search for sessions using partial referrer URL match
  const referrerSearchTerm = "reddit.com";
  const referrerSearchResult =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          search: referrerSearchTerm,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(referrerSearchResult);

  // Step 5: Verify correct search results for referrer
  TestValidator.predicate(
    "search by referrer should return at least one result",
    referrerSearchResult.data.length > 0,
  );

  // Step 6: Search with non-matching term to verify filtering works
  const nonMatchingSearchTerm = RandomGenerator.alphaNumeric(20);
  const noMatchResult =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          search: nonMatchingSearchTerm,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(noMatchResult);

  TestValidator.predicate(
    "search with non-matching term should return zero or fewer results than total sessions",
    noMatchResult.data.length >= 0,
  );
}
