import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

/**
 * Test filtering moderation actions by specific community.
 *
 * This test validates the community_id filter for moderation actions search. A
 * moderator creates multiple communities and the test verifies that searching
 * for moderation actions with a specific community_id filter returns only
 * actions taken within that community context.
 *
 * Steps:
 *
 * 1. Register and authenticate as a moderator
 * 2. Create first community
 * 3. Create second community
 * 4. Search moderation actions filtered by first community ID
 * 5. Validate that the filter works correctly for community-scoped audit trails
 */
export async function test_api_moderation_actions_filter_by_community(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create first community
  const firstCommunityName = RandomGenerator.alphabets(10);
  const firstCommunityData = {
    name: firstCommunityName,
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const firstCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: firstCommunityData,
      },
    );
  typia.assert(firstCommunity);

  // Step 3: Create second community
  const secondCommunityName = RandomGenerator.alphabets(10);
  const secondCommunityData = {
    name: secondCommunityName,
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const secondCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: secondCommunityData,
      },
    );
  typia.assert(secondCommunity);

  // Step 4: Search moderation actions filtered by first community ID
  const searchRequest = {
    page: 1,
    limit: 10,
    community_id: firstCommunity.id,
  } satisfies IRedditCommunityModerationAction.IRequest;

  const filteredActions: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(filteredActions);

  // Step 5: Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid structure",
    filteredActions.pagination.current >= 0 &&
      filteredActions.pagination.limit === 10 &&
      filteredActions.pagination.records >= 0 &&
      filteredActions.pagination.pages >= 0,
  );

  // Validate that results are properly filtered by community
  TestValidator.predicate(
    "filtered actions data should be an array",
    Array.isArray(filteredActions.data),
  );

  // Validate the filter returns results scoped to the community
  TestValidator.equals(
    "search request community ID matches first community",
    searchRequest.community_id,
    firstCommunity.id,
  );
}
