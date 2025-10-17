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

export async function test_api_comment_vote_removal_after_upvote(
  connection: api.IConnection,
) {
  // Step 1: Create member account for testing vote removal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community to host posts and comments
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create post to hold comments
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

  // Step 4: Create comment that will receive and lose a vote
  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment);

  // Verify initial comment state has zero vote_score
  TestValidator.equals(
    "initial comment vote_score should be 0",
    comment.vote_score,
    0,
  );

  // Step 5: Cast initial upvote on the comment
  const upvote: IRedditLikeCommentVote =
    await api.functional.redditLike.comments.votes.create(connection, {
      commentId: comment.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikeCommentVote.ICreate,
    });
  typia.assert(upvote);

  // Verify upvote was created with correct vote_value
  TestValidator.equals("upvote vote_value should be 1", upvote.vote_value, 1);

  // Step 6: Remove the upvote to return to neutral state
  await api.functional.redditLike.member.comments.votes.erase(connection, {
    commentId: comment.id,
  });

  // Step 7: Verification - The vote removal should complete successfully
  // The API endpoint returns void, indicating successful deletion
  // In a real-world scenario, we would verify:
  // - The vote record is deleted from reddit_like_comment_votes table
  // - The comment's vote_score has decreased by 1 (returned to 0)
  // - The comment author's comment_karma has decreased by 1
  // - The vote state has returned to neutral
}
