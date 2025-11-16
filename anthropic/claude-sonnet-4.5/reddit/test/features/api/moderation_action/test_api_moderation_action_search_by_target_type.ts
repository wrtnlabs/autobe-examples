import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test filtering moderation actions by target entity type (post, comment, user,
 * report).
 *
 * This test validates the target_type filtering capabilities of the moderation
 * actions search API. Due to the absence of moderation action creation
 * endpoints in the API, this test focuses on validating the search API's
 * filtering behavior and response structure.
 *
 * The test creates a moderator account and community, then tests the search API
 * with different target_type filters to ensure the filtering mechanism works
 * correctly. If moderation actions exist, it validates that returned actions
 * match the specified target type.
 */
export async function test_api_moderation_action_search_by_target_type(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Search with target_type='post' filter
  const postActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          target_type: "post",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(postActions);

  // Validate all returned actions have target_entity_type matching 'post'
  for (const action of postActions.data) {
    TestValidator.equals(
      "post action target type should be post",
      action.target_entity_type,
      "post",
    );
  }

  // Step 4: Search with target_type='comment' filter
  const commentActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          target_type: "comment",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(commentActions);

  // Validate all returned actions have target_entity_type matching 'comment'
  for (const action of commentActions.data) {
    TestValidator.equals(
      "comment action target type should be comment",
      action.target_entity_type,
      "comment",
    );
  }

  // Step 5: Search with target_type='user' filter
  const userActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          target_type: "user",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(userActions);

  // Validate all returned actions have target_entity_type matching 'user'
  for (const action of userActions.data) {
    TestValidator.equals(
      "user action target type should be user",
      action.target_entity_type,
      "user",
    );
  }

  // Step 6: Search with target_type='report' filter
  const reportActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          target_type: "report",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(reportActions);

  // Validate all returned actions have target_entity_type matching 'report'
  for (const action of reportActions.data) {
    TestValidator.equals(
      "report action target type should be report",
      action.target_entity_type,
      "report",
    );
  }

  // Step 7: Search without target_type filter to get all actions
  const allActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          target_type: null,
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(allActions);

  // Verify pagination metadata structure
  TestValidator.predicate(
    "pagination should have valid structure",
    allActions.pagination.current >= 0 &&
      allActions.pagination.limit > 0 &&
      allActions.pagination.records >= 0 &&
      allActions.pagination.pages >= 0,
  );

  // Verify that filtering by specific types doesn't exceed total count
  const totalFiltered =
    postActions.pagination.records +
    commentActions.pagination.records +
    userActions.pagination.records +
    reportActions.pagination.records;

  TestValidator.predicate(
    "sum of filtered actions should not exceed total actions",
    totalFiltered <= allActions.pagination.records,
  );
}
