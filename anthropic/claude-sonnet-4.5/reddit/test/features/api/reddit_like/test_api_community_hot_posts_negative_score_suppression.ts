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
 * Test negative score suppression in Hot algorithm.
 *
 * This test validates that the Hot sorting algorithm properly suppresses posts
 * with negative net vote scores by assigning them very low hot scores. Posts
 * that receive more downvotes than upvotes should appear at the bottom of
 * hot-sorted feeds or be filtered out entirely, ensuring quality control.
 *
 * Test workflow:
 *
 * 1. Create test member account
 * 2. Create community for testing
 * 3. Create multiple posts in the community
 * 4. Create additional voter members
 * 5. Apply downvotes to some posts (creating negative scores)
 * 6. Apply upvotes to other posts (creating positive scores)
 * 7. Retrieve hot-sorted posts
 * 8. Verify negatively-voted posts rank lower than positively-voted posts
 */
export async function test_api_community_hot_posts_negative_score_suppression(
  connection: api.IConnection,
) {
  // Step 1: Create test member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create community for testing
  const communityData = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create multiple posts - we'll create 5 posts total
  const posts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const postData = {
        community_id: community.id,
        type: "text",
        title: `Test Post ${index + 1} - ${RandomGenerator.name(3)}`,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate;

      const post: IRedditLikePost =
        await api.functional.redditLike.member.posts.create(connection, {
          body: postData,
        });
      typia.assert(post);
      return post;
    },
  );

  // Step 4: Create additional voting members with their own connections
  const voterConnections: api.IConnection[] = await ArrayUtil.asyncRepeat(
    10,
    async () => {
      const voterConnection: api.IConnection = {
        host: connection.host,
      };

      const voterData = {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10) + "A1!",
      } satisfies IRedditLikeMember.ICreate;

      const voter: IRedditLikeMember.IAuthorized =
        await api.functional.auth.member.join(voterConnection, {
          body: voterData,
        });
      typia.assert(voter);

      return voterConnection;
    },
  );

  // Step 5: Apply downvotes to first 2 posts (creating negative scores)
  const negativelyVotedPosts = posts.slice(0, 2);
  for (const post of negativelyVotedPosts) {
    for (let i = 0; i < 8; i++) {
      const downvote: IRedditLikePostVote =
        await api.functional.redditLike.member.posts.votes.create(
          voterConnections[i],
          {
            postId: post.id,
            body: {
              vote_value: -1,
            } satisfies IRedditLikePostVote.ICreate,
          },
        );
      typia.assert(downvote);
    }
  }

  // Step 6: Apply upvotes to last 3 posts (creating positive scores)
  const positivelyVotedPosts = posts.slice(2, 5);
  for (const post of positivelyVotedPosts) {
    for (let i = 0; i < 6; i++) {
      const upvote: IRedditLikePostVote =
        await api.functional.redditLike.member.posts.votes.create(
          voterConnections[i],
          {
            postId: post.id,
            body: {
              vote_value: 1,
            } satisfies IRedditLikePostVote.ICreate,
          },
        );
      typia.assert(upvote);
    }
  }

  // Step 7: Retrieve hot-sorted posts from the community
  const hotPostsResult: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.posts.hot(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IHotRequest,
    });
  typia.assert(hotPostsResult);

  // Step 8: Validate that negatively-voted posts rank lower than positively-voted posts
  const negativelyVotedPostIds = negativelyVotedPosts.map((p) => p.id);
  const positivelyVotedPostIds = positivelyVotedPosts.map((p) => p.id);

  const hotPostIds = hotPostsResult.data.map((p) => p.id);

  // Find positions of negatively and positively voted posts in hot feed
  const negativePostPositions = negativelyVotedPostIds
    .map((id) => hotPostIds.indexOf(id))
    .filter((pos) => pos !== -1);

  const positivePostPositions = positivelyVotedPostIds
    .map((id) => hotPostIds.indexOf(id))
    .filter((pos) => pos !== -1);

  // Verify that all positive posts appear before negative posts (or negative posts are suppressed)
  if (positivePostPositions.length > 0 && negativePostPositions.length > 0) {
    const maxPositivePosition = Math.max(...positivePostPositions);
    const minNegativePosition = Math.min(...negativePostPositions);

    TestValidator.predicate(
      "negatively voted posts should rank lower than positively voted posts",
      maxPositivePosition < minNegativePosition,
    );
  }

  // Verify that negatively voted posts are either suppressed or at the bottom
  TestValidator.predicate(
    "negatively voted posts should be suppressed or appear at bottom of feed",
    negativePostPositions.length === 0 ||
      negativePostPositions.every((pos) => pos >= hotPostIds.length - 2),
  );
}
