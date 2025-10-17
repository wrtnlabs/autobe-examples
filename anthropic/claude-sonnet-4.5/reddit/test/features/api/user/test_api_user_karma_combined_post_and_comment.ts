import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that total karma correctly sums post karma and comment karma from
 * multiple content types.
 *
 * This test validates the karma aggregation system by creating an author who
 * contributes both a post and a comment, then having voters upvote both
 * contributions. The karma calculation should properly attribute votes on posts
 * to post_karma, votes on comments to comment_karma, and accurately sum both
 * into total_karma.
 *
 * Test Flow:
 *
 * 1. Create author account and authenticate
 * 2. Create a community for posting content
 * 3. Author creates a post in the community
 * 4. Author creates a comment on the post
 * 5. Create voter accounts (2 voters for diversity)
 * 6. Voter 1 upvotes the post
 * 7. Voter 2 upvotes the comment
 * 8. Retrieve author's karma and validate aggregation
 * 9. Verify post_karma > 0 (from post upvote)
 * 10. Verify comment_karma > 0 (from comment upvote)
 * 11. Verify total_karma = post_karma + comment_karma
 */
export async function test_api_user_karma_combined_post_and_comment(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate author account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(12);
  const authorPassword = RandomGenerator.alphaNumeric(10);

  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: authorUsername,
      email: authorEmail,
      password: authorPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(author);

  // Step 2: Create a community for posting
  const communityCode = RandomGenerator.alphaNumeric(10);
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Author creates a post
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Author creates a comment on the post
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Create first voter account
  const voter1Email = typia.random<string & tags.Format<"email">>();
  const voter1Username = RandomGenerator.alphaNumeric(12);
  const voter1Password = RandomGenerator.alphaNumeric(10);

  const voter1 = await api.functional.auth.member.join(connection, {
    body: {
      username: voter1Username,
      email: voter1Email,
      password: voter1Password,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(voter1);

  // Step 6: Voter 1 upvotes the post
  const postVote = await api.functional.redditLike.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(postVote);

  // Step 7: Create second voter account
  const voter2Email = typia.random<string & tags.Format<"email">>();
  const voter2Username = RandomGenerator.alphaNumeric(12);
  const voter2Password = RandomGenerator.alphaNumeric(10);

  const voter2 = await api.functional.auth.member.join(connection, {
    body: {
      username: voter2Username,
      email: voter2Email,
      password: voter2Password,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(voter2);

  // Step 8: Voter 2 upvotes the comment
  const commentVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: comment.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikeCommentVote.ICreate,
    });
  typia.assert(commentVote);

  // Step 9: Retrieve author's karma
  const karma = await api.functional.redditLike.users.karma.at(connection, {
    userId: author.id,
  });
  typia.assert(karma);

  // Step 10: Validate post_karma is positive (author received upvote on post)
  TestValidator.predicate(
    "post_karma should be positive from post upvote",
    karma.post_karma > 0,
  );

  // Step 11: Validate comment_karma is positive (author received upvote on comment)
  TestValidator.predicate(
    "comment_karma should be positive from comment upvote",
    karma.comment_karma > 0,
  );

  // Step 12: Validate total_karma equals sum of post_karma and comment_karma
  TestValidator.equals(
    "total_karma should equal post_karma + comment_karma",
    karma.total_karma,
    karma.post_karma + karma.comment_karma,
  );
}
