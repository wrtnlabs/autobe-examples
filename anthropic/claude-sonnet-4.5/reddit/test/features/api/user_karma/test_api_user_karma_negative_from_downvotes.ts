import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that user karma can become negative through downvotes.
 *
 * This test validates the karma system's ability to track negative reputation
 * scores when a user's content receives more downvotes than upvotes. The test
 * creates an author account, posts content to a community, simulates multiple
 * users downvoting the post, and verifies that the author's karma becomes
 * negative without any minimum limit enforcement.
 *
 * Steps:
 *
 * 1. Create author account
 * 2. Create community for posting
 * 3. Create a post in the community
 * 4. Create multiple voter accounts
 * 5. Each voter casts a downvote on the post
 * 6. Retrieve author's karma
 * 7. Verify post_karma is negative
 */
export async function test_api_user_karma_negative_from_downvotes(
  connection: api.IConnection,
) {
  // Step 1: Create author account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: authorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(author);

  // Step 2: Create community for posting
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        allow_text_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4 & 5: Create multiple voter accounts and cast downvotes
  const voterCount = 5;
  await ArrayUtil.asyncRepeat(voterCount, async (index) => {
    // Create voter account
    const voterEmail = typia.random<string & tags.Format<"email">>();
    const voter: IRedditLikeMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          username: RandomGenerator.alphaNumeric(12),
          email: voterEmail,
          password: typia.random<string & tags.MinLength<8>>(),
        } satisfies IRedditLikeMember.ICreate,
      });
    typia.assert(voter);

    // Cast downvote on the post
    const vote: IRedditLikePostVote =
      await api.functional.redditLike.member.posts.votes.create(connection, {
        postId: post.id,
        body: {
          vote_value: -1,
        } satisfies IRedditLikePostVote.ICreate,
      });
    typia.assert(vote);
  });

  // Step 6: Retrieve author's karma
  const karma: IRedditLikeUser.IKarma =
    await api.functional.redditLike.users.karma.at(connection, {
      userId: author.id,
    });
  typia.assert(karma);

  // Step 7: Verify post_karma is negative
  TestValidator.predicate(
    "post karma should be negative after downvotes",
    karma.post_karma < 0,
  );

  TestValidator.equals(
    "post karma should equal negative vote count",
    karma.post_karma,
    -voterCount,
  );
}
