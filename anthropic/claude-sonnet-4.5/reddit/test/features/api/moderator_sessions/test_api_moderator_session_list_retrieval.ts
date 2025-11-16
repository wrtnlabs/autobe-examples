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
 * Test moderator session list retrieval with pagination.
 *
 * This test validates that a moderator can successfully retrieve their own
 * authentication session history using paginated queries. The workflow
 * includes:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Query the moderator's session list with pagination parameters
 * 3. Validate the paginated response structure and session data
 * 4. Verify session metadata and pagination information
 */
export async function test_api_moderator_session_list_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve the moderator's session list with pagination
  const sessionPage: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sessionPage);

  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "limit should be positive",
    sessionPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be at least 1",
    sessionPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages should be at least 1",
    sessionPage.pagination.pages >= 1,
  );

  // Step 4: Validate session data exists
  TestValidator.predicate(
    "session data should not be empty",
    sessionPage.data.length > 0,
  );

  // Step 5: Validate the first session belongs to the moderator
  const firstSession = sessionPage.data[0];
  typia.assert(firstSession);
  TestValidator.equals(
    "session belongs to the moderator",
    firstSession.reddit_community_moderator_id,
    moderator.id,
  );
}
