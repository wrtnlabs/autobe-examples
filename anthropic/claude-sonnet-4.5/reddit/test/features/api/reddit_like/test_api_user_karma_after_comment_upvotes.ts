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
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that user karma correctly reflects upvotes received on comments.
 *
 * This test validates the karma system's ability to track and increment
 * comment_karma when a user's comment receives an upvote. The workflow creates
 * an author account, a voter account, establishes a community context with a
 * post, creates a comment by the author, has the voter upvote that comment, and
 * finally verifies that the author's comment_karma increased by exactly 1
 * point.
 *
 * The test ensures proper separation between post_karma and comment_karma,
 * validating that upvotes on comments contribute only to comment_karma and not
 * to post_karma.
 *
 * Test workflow:
 *
 * 1. Create author member account
 * 2. Create voter member account
 * 3. Author creates a community
 * 4. Author creates a post in the community
 * 5. Author creates a comment on the post
 * 6. Switch to voter account and upvote the comment
 * 7. Retrieve author's karma and validate comment_karma is 1
 * 8. Validate post_karma remains 0
 */
export async function test_api_user_karma_after_comment_upvotes(
  connection: api.IConnection,
) {
  // Step 1: Create author member account
  const authorData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: authorData,
    });
  typia.assert(author);

  // Step 2: Create voter member account
  const voterData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const voter: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: voterData,
    });
  typia.assert(voter);

  // Step 3: Switch back to author and create a community
  connection.headers = { Authorization: author.token.access };

  const communityData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Author creates a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Author creates a comment on the post
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Step 6: Switch to voter account and upvote the comment
  connection.headers = { Authorization: voter.token.access };

  const voteData = {
    vote_value: 1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const vote: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: comment.id,
      body: voteData,
    });
  typia.assert(vote);

  // Step 7: Retrieve author's karma
  const karma: IRedditLikeUser.IKarma =
    await api.functional.redditLike.users.karma.at(connection, {
      userId: author.id,
    });
  typia.assert(karma);

  // Step 8: Validate comment_karma increased by 1
  TestValidator.equals(
    "comment karma should be 1 after upvote",
    karma.comment_karma,
    1,
  );

  // Step 9: Validate post_karma remains 0 (no post votes)
  TestValidator.equals("post karma should remain 0", karma.post_karma, 0);

  // Step 10: Validate total_karma is the sum
  TestValidator.equals("total karma should be 1", karma.total_karma, 1);
}
