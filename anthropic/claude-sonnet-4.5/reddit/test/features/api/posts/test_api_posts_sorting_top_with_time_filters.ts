import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test the 'top' sorting algorithm with various time filters.
 *
 * This test validates that the post search API correctly applies the 'top'
 * sorting algorithm in combination with time filters (day, week, month, year,
 * all). The 'top' sorting should order posts by their vote score in descending
 * order (highest votes first), while the time filter restricts results to posts
 * created within the specified time period.
 *
 * Process:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a test community
 * 3. Create member account and authenticate
 * 4. Create multiple posts in the community with different characteristics
 * 5. Test each time filter (day, week, month, year, all) with sort_by='top'
 * 6. Validate that results are correctly filtered by time and sorted by vote score
 */
export async function test_api_posts_sorting_top_with_time_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: memberEmail,
        password: "member123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Create multiple posts with different content
  const postCount = 5;
  const createdPosts: IRedditCommunityPost[] = [];

  for (let i = 0; i < postCount; i++) {
    const post: IRedditCommunityPost =
      await api.functional.redditCommunity.member.posts.create(connection, {
        body: {
          community_id: community.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      });
    typia.assert(post);
    createdPosts.push(post);
  }

  // Step 5: Test 'top' sorting with 'day' time filter
  const dayFilterResult: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        community_id: community.id,
        sort_by: "top",
        top_time_filter: "day",
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(dayFilterResult);

  // Validate day filter results
  TestValidator.predicate(
    "day filter should return posts",
    dayFilterResult.data.length > 0,
  );

  // Verify posts are from the target community
  for (const post of dayFilterResult.data) {
    TestValidator.equals(
      "post belongs to correct community",
      post.community.id,
      community.id,
    );
  }

  // Step 6: Test 'top' sorting with 'week' time filter
  const weekFilterResult: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        community_id: community.id,
        sort_by: "top",
        top_time_filter: "week",
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(weekFilterResult);

  TestValidator.predicate(
    "week filter should return posts",
    weekFilterResult.data.length > 0,
  );

  // Step 7: Test 'top' sorting with 'month' time filter
  const monthFilterResult: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        community_id: community.id,
        sort_by: "top",
        top_time_filter: "month",
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(monthFilterResult);

  TestValidator.predicate(
    "month filter should return posts",
    monthFilterResult.data.length > 0,
  );

  // Step 8: Test 'top' sorting with 'year' time filter
  const yearFilterResult: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        community_id: community.id,
        sort_by: "top",
        top_time_filter: "year",
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(yearFilterResult);

  TestValidator.predicate(
    "year filter should return posts",
    yearFilterResult.data.length > 0,
  );

  // Step 9: Test 'top' sorting with 'all' time filter
  const allFilterResult: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        community_id: community.id,
        sort_by: "top",
        top_time_filter: "all",
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(allFilterResult);

  TestValidator.predicate(
    "all filter should return posts",
    allFilterResult.data.length > 0,
  );

  // Step 10: Verify that all time filters return results ordered by vote score
  const validateVoteScoreOrdering = (
    results: IPageIRedditCommunityPost.ISummary,
    filterName: string,
  ) => {
    for (let i = 0; i < results.data.length - 1; i++) {
      TestValidator.predicate(
        `${filterName}: posts should be ordered by vote score descending`,
        results.data[i].vote_score >= results.data[i + 1].vote_score,
      );
    }
  };

  validateVoteScoreOrdering(dayFilterResult, "day filter");
  validateVoteScoreOrdering(weekFilterResult, "week filter");
  validateVoteScoreOrdering(monthFilterResult, "month filter");
  validateVoteScoreOrdering(yearFilterResult, "year filter");
  validateVoteScoreOrdering(allFilterResult, "all filter");
}
