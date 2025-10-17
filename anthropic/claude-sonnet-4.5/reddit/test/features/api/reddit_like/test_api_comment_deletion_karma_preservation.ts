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

export async function test_api_comment_deletion_karma_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create comment author account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = "SecurePass123!";
  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: authorEmail,
        password: authorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(author);

  const initialKarma = author.comment_karma;

  // Step 2: Create second member (upvoter)
  const upvoterEmail = typia.random<string & tags.Format<"email">>();
  const upvoterPassword = "SecurePass123!";
  const upvoter: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: upvoterEmail,
        password: upvoterPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(upvoter);

  // Step 3: Create third member (downvoter)
  const downvoterEmail = typia.random<string & tags.Format<"email">>();
  const downvoterPassword = "SecurePass123!";
  const downvoter: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: downvoterEmail,
        password: downvoterPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(downvoter);

  // Switch back to author for community and post creation
  const authorReauth: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: author.username,
        email: authorEmail,
        password: authorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(authorReauth);

  // Step 4: Author creates a community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 5: Author creates a post in the community
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

  // Step 6: Author creates a comment on the post
  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment);

  const initialCommentScore = comment.vote_score;
  TestValidator.equals(
    "initial comment vote score is zero",
    initialCommentScore,
    0,
  );

  // Step 7: Second member upvotes the comment
  const upvoterReauth: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: upvoter.username,
        email: upvoterEmail,
        password: upvoterPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(upvoterReauth);

  const upvote: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: comment.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikeCommentVote.ICreate,
    });
  typia.assert(upvote);

  // Step 8: Third member downvotes the comment
  const downvoterReauth: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: downvoter.username,
        email: downvoterEmail,
        password: downvoterPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(downvoterReauth);

  const downvote: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: comment.id,
      body: {
        vote_value: -1,
      } satisfies IRedditLikeCommentVote.ICreate,
    });
  typia.assert(downvote);

  // Step 9: Switch back to author and verify karma changed
  const authorBeforeDeletion: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: author.username,
        email: authorEmail,
        password: authorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(authorBeforeDeletion);

  const karmaBeforeDeletion = authorBeforeDeletion.comment_karma;

  // Step 10: Author deletes the comment
  await api.functional.redditLike.member.comments.erase(connection, {
    commentId: comment.id,
  });

  // Step 11: Verify karma was NOT reversed after deletion
  const authorAfterDeletion: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: author.username,
        email: authorEmail,
        password: authorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(authorAfterDeletion);

  TestValidator.equals(
    "comment karma preserved after deletion",
    authorAfterDeletion.comment_karma,
    karmaBeforeDeletion,
  );
}
