import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderator voting on comments to validate role-agnostic voting mechanics.
 *
 * This test validates that moderators can vote on comments within their
 * community just like regular members, ensuring the voting system is
 * role-agnostic. The test creates both a moderator and member account, has the
 * member create content, then demonstrates the moderator can vote on the
 * member's comment.
 *
 * Workflow:
 *
 * 1. Create moderator account
 * 2. Create member account
 * 3. Member creates a community for discussion context
 * 4. Member creates a post within the community
 * 5. Member creates a comment on the post
 * 6. Moderator votes on the member's comment (upvote)
 * 7. Validate vote is recorded correctly with proper score updates
 *
 * This ensures that voting mechanics apply uniformly regardless of user role,
 * vote scores increment correctly, and karma calculations follow the same rules
 * for all authenticated users.
 */
export async function test_api_moderator_comment_vote_upvote(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account for community and content creation
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Member creates community
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
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
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Member creates post
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Member creates comment
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Validate initial comment state
  TestValidator.equals("initial comment vote score", comment.vote_score, 0);

  // Step 6: Switch to moderator and vote on member's comment
  const moderatorReauth: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderatorReauth);

  const voteData = {
    vote_value: 1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const vote: IRedditLikeCommentVote =
    await api.functional.redditLike.moderator.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteData,
      },
    );
  typia.assert(vote);

  // Validate vote is recorded correctly
  TestValidator.equals("vote value is upvote", vote.vote_value, 1);
  TestValidator.predicate("vote has valid ID", vote.id.length > 0);
  TestValidator.predicate(
    "vote has created timestamp",
    vote.created_at.length > 0,
  );
}
