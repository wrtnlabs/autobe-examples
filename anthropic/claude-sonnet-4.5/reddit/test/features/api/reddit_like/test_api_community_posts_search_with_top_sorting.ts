import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test retrieving posts from a community sorted by Top algorithm (highest vote
 * scores).
 *
 * This test validates the Top sorting algorithm which ranks posts by net vote
 * score with optional time range filters. The test creates a community,
 * multiple posts, casts votes to establish different vote scores, then searches
 * with Top sorting to verify results are ordered by net vote score (upvotes
 * minus downvotes) with highest scores first.
 *
 * Test workflow:
 *
 * 1. Create multiple member accounts for voting diversity
 * 2. Create a test community
 * 3. Create multiple posts with varied content
 * 4. Cast votes to establish different vote scores
 * 5. Search posts with Top sorting
 * 6. Validate correct ordering by vote score (highest first)
 * 7. Verify pagination and consistency with equal scores
 */
export async function test_api_community_posts_search_with_top_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create multiple member accounts for voting diversity
  const members: IRedditLikeMember.IAuthorized[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const member = await api.functional.auth.member.join(connection, {
        body: {
          username: `${RandomGenerator.name(1)}_${RandomGenerator.alphaNumeric(6)}`,
          email: `${RandomGenerator.alphaNumeric(8)}@${RandomGenerator.name(1)}.com`,
          password: RandomGenerator.alphaNumeric(10),
        } satisfies IRedditLikeMember.ICreate,
      });
      typia.assert(member);
      return member;
    },
  );

  // Step 2: Create a test community (using first member)
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: `test_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create multiple posts with varied content types
  const postTypes = ["text", "link", "image"] as const;
  const posts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(
    6,
    async (index) => {
      const postType = RandomGenerator.pick(postTypes);

      const basePost = {
        community_id: community.id,
        type: postType,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
      };

      let postBody: IRedditLikePost.ICreate;
      if (postType === "text") {
        postBody = {
          ...basePost,
          body: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IRedditLikePost.ICreate;
      } else if (postType === "link") {
        postBody = {
          ...basePost,
          url: `https://${RandomGenerator.name(1)}.com/${RandomGenerator.alphaNumeric(10)}`,
        } satisfies IRedditLikePost.ICreate;
      } else {
        postBody = {
          ...basePost,
          image_url: `https://images.${RandomGenerator.name(1)}.com/${RandomGenerator.alphaNumeric(12)}.png`,
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditLikePost.ICreate;
      }

      const post = await api.functional.redditLike.member.posts.create(
        connection,
        {
          body: postBody,
        },
      );
      typia.assert(post);
      return post;
    },
  );

  // Step 4: Cast votes to establish different vote scores
  // Design vote distribution to create clear ranking:
  // Post 0: +4 votes (4 upvotes from members 1-4)
  // Post 1: +3 votes (4 upvotes, 1 downvote)
  // Post 2: +2 votes (3 upvotes, 1 downvote)
  // Post 3: +1 vote (2 upvotes, 1 downvote)
  // Post 4: 0 votes (1 upvote, 1 downvote)
  // Post 5: -1 vote (1 downvote from member 1)

  const votePatterns = [
    [1, 1, 1, 1], // Post 0: 4 upvotes
    [1, 1, 1, 1, -1], // Post 1: 4 upvotes, 1 downvote
    [1, 1, 1, -1], // Post 2: 3 upvotes, 1 downvote
    [1, 1, -1], // Post 3: 2 upvotes, 1 downvote
    [1, -1], // Post 4: 1 upvote, 1 downvote
    [-1], // Post 5: 1 downvote
  ];

  for (let postIndex = 0; postIndex < posts.length; postIndex++) {
    const votes = votePatterns[postIndex];
    for (let voteIndex = 0; voteIndex < votes.length; voteIndex++) {
      // Switch to different member for each vote
      const voterMember = members[voteIndex + 1];
      const tempConnection = { ...connection };
      tempConnection.headers = { Authorization: voterMember.token.access };

      await api.functional.redditLike.member.posts.votes.create(
        tempConnection,
        {
          postId: posts[postIndex].id,
          body: {
            vote_value: votes[voteIndex],
          } satisfies IRedditLikePostVote.ICreate,
        },
      );
    }
  }

  // Step 5: Search posts with Top sorting
  const searchResult =
    await api.functional.redditLike.communities.posts.searchPosts(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "top",
      } satisfies IRedditLikeCommunity.IPostSearchRequest,
    });
  typia.assert(searchResult);

  // Step 6: Validate correct ordering by vote score (highest first)
  TestValidator.equals(
    "should return all posts",
    searchResult.data.length,
    posts.length,
  );

  // Expected order by vote score: Post 0 (+4), Post 1 (+3), Post 2 (+2), Post 3 (+1), Post 4 (0), Post 5 (-1)
  const expectedOrder = [
    posts[0].id,
    posts[1].id,
    posts[2].id,
    posts[3].id,
    posts[4].id,
    posts[5].id,
  ];
  const actualOrder = searchResult.data.map((p) => p.id);

  TestValidator.equals(
    "posts should be ordered by vote score descending",
    actualOrder,
    expectedOrder,
  );

  // Step 7: Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records",
    searchResult.pagination.records,
    posts.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    searchResult.pagination.pages === Math.ceil(posts.length / 10),
  );
}
