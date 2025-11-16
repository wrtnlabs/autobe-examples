import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

/**
 * Test retrieving all moderation actions with basic pagination.
 *
 * This test validates the moderation actions search endpoint by authenticating
 * a moderator and executing a search request with only pagination parameters
 * (no filters). It verifies that the API correctly returns a paginated response
 * with proper metadata structure.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Search for moderation actions using basic pagination
 * 3. Validate the paginated response structure and metadata
 */
export async function test_api_moderation_actions_search_all_actions(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<20>>(),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Search for all moderation actions with basic pagination
  const searchRequest = {
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityModerationAction.IRequest;

  const searchResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 3: Validate business logic - data length respects pagination limit
  TestValidator.predicate(
    "data array length respects pagination limit",
    searchResult.data.length <= searchRequest.limit,
  );
}
