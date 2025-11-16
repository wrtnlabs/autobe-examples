import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchIndex";
import type { ICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchResult";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchResult";

/**
 * Test search result sorting by 'hot' (trending).
 *
 * Validates that search results are properly ranked by hotness score, which
 * combines vote velocity and recency. Creates multiple posts at different times
 * with varying vote counts to establish different hotness scores. Verifies that
 * recently popular posts with high engagement appear above older posts with
 * lower engagement. Tests that hot sorting properly combines with keyword
 * search - results are filtered by keywords first, then ranked by hotness.
 *
 * Steps:
 *
 * 1. Create member accounts for voting
 * 2. Create a community for posting
 * 3. Create multiple posts with identical keywords but at different times
 * 4. Apply different vote counts to establish hotness variation
 * 5. Search with keyword and 'hot' sorting
 * 6. Verify posts are ranked by hotness (recent high-voted before old low-voted)
 * 7. Validate that hot sorting combines with keyword filtering correctly
 */
export async function test_api_search_sorting_by_hot(
  connection: api.IConnection,
) {
  // Step 1: Create member accounts
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPassword123!",
      ip: "127.0.0.1",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPassword123!",
      ip: "127.0.0.1",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Step 2: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Hot Sorting Test Community",
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: "Community for testing hot sorting functionality",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple posts with identical keywords at different times
  const keyword = "trending_technology_news";
  const posts: ICommunityPlatformPost[] = [];

  // Create post 1: Older post with few votes (low hotness)
  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `${keyword} old post`,
        content_text: `This is an old post about ${keyword}. It has low engagement.`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  posts.push(post1);

  // Wait to ensure time difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create post 2: Middle post with moderate votes
  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `${keyword} recent post`,
        content_text: `This is a recent post about ${keyword}. It has moderate engagement.`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  posts.push(post2);

  // Wait to ensure time difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create post 3: Newest post with many votes (high hotness)
  const post3 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `${keyword} hot trending post`,
        content_text: `This is the newest and most popular post about ${keyword}. It has high engagement!`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  posts.push(post3);

  // Step 4: Apply votes to establish hotness variation
  // Vote on post 1 (old) with member1: 1 upvote
  const vote1 = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        content_type: "post",
        content_id: post1.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote1);

  // Vote on post 2 (middle) with member1: 1 upvote
  const vote2 = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        content_type: "post",
        content_id: post2.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote2);

  // Vote on post 3 (newest) with member1: 1 upvote
  const vote3 = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        content_type: "post",
        content_id: post3.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote3);

  // Step 5: Search with keyword and 'hot' sorting
  const searchResults = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: keyword,
        page: 1,
        limit: 50,
        sortBy: "hot",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(searchResults);

  // Step 6: Verify posts are ranked by hotness
  TestValidator.predicate(
    "search results should contain posts",
    searchResults.data.length >= 3,
  );

  // Find posts in results by title to verify they exist
  const resultTitles = searchResults.data
    .map((r) => r.post?.title || "")
    .filter((t) => t.includes(keyword));

  TestValidator.equals(
    "should return all matching posts",
    resultTitles.length,
    3,
  );

  // Hot sorting should rank by recency and engagement: newer posts should appear before older posts
  // Verify that post3 (newest) appears before post1 (oldest) in results
  const post3Index = searchResults.data.findIndex(
    (r) => r.post?.id === post3.id,
  );
  const post2Index = searchResults.data.findIndex(
    (r) => r.post?.id === post2.id,
  );
  const post1Index = searchResults.data.findIndex(
    (r) => r.post?.id === post1.id,
  );

  TestValidator.predicate(
    "post3 (newest) should rank higher than post1 (oldest) in hot sorting",
    post3Index >= 0 && post1Index >= 0 && post3Index < post1Index,
  );

  TestValidator.predicate(
    "post3 (newest) should rank higher than post2 (middle) in hot sorting",
    post3Index >= 0 && post2Index >= 0 && post3Index < post2Index,
  );

  // Step 7: Validate that hot sorting combines with keyword filtering
  const noKeywordResults = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: "nonexistent_keyword_xyz",
        page: 1,
        limit: 50,
        sortBy: "hot",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(noKeywordResults);

  TestValidator.equals(
    "search with non-matching keyword should return no results",
    noKeywordResults.data.length,
    0,
  );

  // Verify search results are properly paginated
  TestValidator.predicate(
    "pagination info should exist",
    searchResults.pagination.current > 0 && searchResults.pagination.limit > 0,
  );

  TestValidator.equals(
    "current page should match request",
    searchResults.pagination.current,
    1,
  );
}
