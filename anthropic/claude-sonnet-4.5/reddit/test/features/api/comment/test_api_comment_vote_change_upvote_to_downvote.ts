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

export async function test_api_comment_vote_change_upvote_to_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create member account who will author the comment
  const commentAuthorEmail = typia.random<string & tags.Format<"email">>();
  const commentAuthorPassword = RandomGenerator.alphaNumeric(12);
  const commentAuthor = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: commentAuthorEmail,
      password: commentAuthorPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(commentAuthor);

  // Step 2: Create a community as the comment author
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 3 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Create another member account who will vote
  const voter = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(voter);

  // Step 6: Cast initial upvote on the comment by the voter
  const initialVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: comment.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikeCommentVote.ICreate,
    });
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote should be upvote",
    initialVote.vote_value,
    1,
  );

  // Step 7: Change vote from upvote to downvote
  const changedVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: comment.id,
      body: {
        vote_value: -1,
      } satisfies IRedditLikeCommentVote.ICreate,
    });
  typia.assert(changedVote);

  // Step 8: Validate the vote change
  TestValidator.equals(
    "vote should now be downvote",
    changedVote.vote_value,
    -1,
  );
  TestValidator.predicate(
    "changed vote should have valid UUID",
    typia.is<string & tags.Format<"uuid">>(changedVote.id),
  );
}
